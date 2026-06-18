"""Payment service — Stripe charge/refund logic with race-safe confirmation.

Invariants enforced (see CLAUDE.md):
  * money is integer paise, never float
  * confirmation is transactional with row locks; the booking_slots GIST
    exclusion guarantees only one confirmed booking per slot
  * losing payers are auto-refunded
  * every money movement writes an append-only ledger entry

Commit policy: create_payment_intent / refund_booking are called from request
handlers and commit themselves. confirm_payment / fail_payment are called from
the webhook handler, which owns the commit.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.stripe_client import get_stripe
from app.core.exceptions import NotFoundError, ForbiddenError, BadRequestError
from app.modules.auth.dependencies import AuthContext
from app.modules.booking.models import (
    Booking, BookingStatus, PaymentStatus, BookingSlot, BookingStatusHistory,
)
from app.modules.booking.state_machine import can_transition
from app.modules.venue.models import Venue
from app.modules.payment.models import (
    Payment, Refund, LedgerEntry, PaymentAttemptStatus, RefundStatus,
)
from app.modules.payment.schemas import (
    PaymentIntentResponse, PaymentResponse, RefundResponse,
)
from app.modules.notification import service as notifications

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Request-path: create a payment intent
# --------------------------------------------------------------------------- #
def create_payment_intent(db: Session, current_user_id, booking_id: str) -> PaymentIntentResponse:
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    if not booking:
        raise NotFoundError("Booking not found")
    if str(booking.user_id) != str(current_user_id):
        raise ForbiddenError("You do not own this booking")
    if booking.status != BookingStatus.accepted:
        raise BadRequestError("Booking is not awaiting payment")
    now = datetime.now(timezone.utc)
    if not booking.hold_expires_at or booking.hold_expires_at < now:
        raise BadRequestError("Payment hold has expired")

    venue = db.get(Venue, booking.venue_id)
    if not venue:
        raise NotFoundError("Venue not found")

    amount_paise = booking.amount_paise
    if amount_paise <= 0:
        amount_paise = round(venue.starting_price_paise * settings.token_advance_pct / 100)
        booking.amount_paise = amount_paise

    stripe = get_stripe()
    intent = stripe.PaymentIntent.create(
        amount=amount_paise,
        currency=settings.stripe_currency,
        metadata={"booking_id": str(booking.id), "user_id": str(booking.user_id)},
        idempotency_key=f"booking-{booking.id}",
    )

    payment = Payment(
        booking_id=booking.id,
        amount_paise=amount_paise,
        currency=settings.stripe_currency,
        status=PaymentAttemptStatus.pending,
        stripe_payment_intent_id=intent.id,
        stripe_client_secret=intent.client_secret,
    )
    db.add(payment)
    booking.stripe_payment_intent_id = intent.id
    booking.payment_status = PaymentStatus.pending
    db.commit()
    db.refresh(payment)

    return PaymentIntentResponse(
        payment_id=str(payment.id),
        booking_id=str(booking.id),
        client_secret=intent.client_secret,
        amount_paise=amount_paise,
        currency=payment.currency,
        status=payment.status.value,
    )


# --------------------------------------------------------------------------- #
# Webhook-path: confirm / fail (caller commits)
# --------------------------------------------------------------------------- #
def confirm_payment(db: Session, payment_intent_id: str) -> None:
    payment = (
        db.query(Payment)
        .filter(Payment.stripe_payment_intent_id == payment_intent_id)
        .with_for_update()
        .first()
    )
    if not payment:
        logger.warning("confirm_payment: no payment for intent %s", payment_intent_id)
        return
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).with_for_update().first()
    if not booking:
        logger.warning("confirm_payment: no booking for payment %s", payment.id)
        return

    # Idempotent: already confirmed
    if payment.status == PaymentAttemptStatus.succeeded and booking.status == BookingStatus.confirmed:
        return

    # Booking left the payable state (hold expired / canceled) before the webhook
    # arrived — the money is owed back.
    if booking.status != BookingStatus.accepted:
        logger.warning("confirm_payment: booking %s in %s, refunding stray payment", booking.id, booking.status)
        _record_refund(db, payment, booking, payment.amount_paise, "booking_not_payable")
        return

    venue = db.get(Venue, booking.venue_id)

    # Claim the slot(s). The GIST exclusion rejects a second blocking range that
    # overlaps an existing one on the same venue -> the loser hits IntegrityError.
    slots = db.query(BookingSlot).filter(BookingSlot.booking_id == booking.id).all()
    for s in slots:
        s.is_blocking = True
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        logger.info("confirm_payment: booking %s lost the slot race; conflict-canceling", booking_id)
        _conflict_cancel_self_and_refund(db, payment_intent_id)
        return

    # Won (or no slots yet). Confirm.
    if not can_transition(booking.status, BookingStatus.confirmed):
        logger.error("confirm_payment: illegal transition %s -> confirmed", booking.status)
        return

    payment.status = PaymentAttemptStatus.succeeded
    booking.status = BookingStatus.confirmed
    booking.payment_status = PaymentStatus.paid

    owner_id = venue.owner_id if venue else booking.user_id
    db.add(LedgerEntry(
        booking_id=booking.id, venue_id=booking.venue_id, owner_id=owner_id,
        user_id=booking.user_id, entry_type="charge", amount_paise=payment.amount_paise,
        direction="credit", stripe_pi_ref=payment_intent_id,
    ))

    fee_pct = venue.platform_fee_pct if venue else settings.platform_fee_pct
    fee = booking.platform_fee_paise or round(payment.amount_paise * fee_pct / 100)
    booking.platform_fee_paise = fee
    if fee:
        db.add(LedgerEntry(
            booking_id=booking.id, venue_id=booking.venue_id, owner_id=owner_id,
            user_id=booking.user_id, entry_type="platform_fee", amount_paise=fee,
            direction="debit", stripe_pi_ref=payment_intent_id,
        ))

    db.add(BookingStatusHistory(
        booking_id=booking.id, old_status="accepted", new_status="confirmed",
        reason="token_payment_succeeded",
    ))

    # Knock out competitors for the same slot and refund any who already paid.
    for competitor in _find_competing_bookings(db, booking):
        _conflict_cancel(db, competitor, venue)

    venue_name = venue.name if venue else "your venue"
    notifications.notify(db, booking.user_id, "payment_confirmed",
                         context={"venue_name": venue_name}, booking_id=booking.id)
    if venue:
        notifications.notify(db, venue.owner_id, "payment_confirmed",
                             context={"venue_name": venue_name}, booking_id=booking.id)


def fail_payment(db: Session, payment_intent_id: str) -> None:
    payment = (
        db.query(Payment)
        .filter(Payment.stripe_payment_intent_id == payment_intent_id)
        .with_for_update()
        .first()
    )
    if not payment:
        return
    payment.status = PaymentAttemptStatus.failed
    booking = db.get(Booking, payment.booking_id)
    if booking and booking.payment_status == PaymentStatus.pending:
        booking.payment_status = PaymentStatus.unpaid


# --------------------------------------------------------------------------- #
# Request-path: owner / admin refund (full)
# --------------------------------------------------------------------------- #
def refund_booking(db: Session, booking_id: str, current_user: AuthContext, reason: str | None) -> RefundResponse:
    booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
    if not booking:
        raise NotFoundError("Booking not found")

    venue = db.get(Venue, booking.venue_id)
    is_venue_owner = current_user.is_owner() and venue and str(venue.owner_id) == str(current_user.user_id)
    if not current_user.is_admin() and not is_venue_owner:
        raise ForbiddenError("Only the venue owner or an admin can refund this booking")

    payment = _succeeded_payment(db, booking.id)
    if not payment:
        raise BadRequestError("No captured payment to refund")

    refunded = _record_refund(db, payment, booking, payment.amount_paise, reason or "owner_cancellation")

    if booking.status == BookingStatus.confirmed:
        booking.status = BookingStatus.canceled
        db.add(BookingStatusHistory(
            booking_id=booking.id, old_status="confirmed", new_status="canceled",
            reason=reason or "owner_cancellation",
        ))
        # release the slots so they can be rebooked
        for s in db.query(BookingSlot).filter(BookingSlot.booking_id == booking.id).all():
            s.is_blocking = False

    db.commit()
    return RefundResponse(booking_id=str(booking.id), refunded_paise=refunded, status="succeeded")


def list_payments_for_booking(db: Session, booking_id: str, current_user: AuthContext) -> list[PaymentResponse]:
    booking = db.get(Booking, booking_id)
    if not booking:
        raise NotFoundError("Booking not found")
    venue = db.get(Venue, booking.venue_id)
    is_owner_of_booking = str(booking.user_id) == str(current_user.user_id)
    is_venue_owner = current_user.is_owner() and venue and str(venue.owner_id) == str(current_user.user_id)
    if not (is_owner_of_booking or is_venue_owner or current_user.is_admin()):
        raise ForbiddenError("Not allowed to view these payments")
    rows = db.query(Payment).filter(Payment.booking_id == booking_id).all()
    return [
        PaymentResponse(
            id=str(p.id), booking_id=str(p.booking_id), amount_paise=p.amount_paise,
            currency=p.currency, status=p.status.value,
            stripe_payment_intent_id=p.stripe_payment_intent_id,
        )
        for p in rows
    ]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _succeeded_payment(db: Session, booking_id) -> Payment | None:
    return (
        db.query(Payment)
        .filter(Payment.booking_id == booking_id, Payment.status == PaymentAttemptStatus.succeeded)
        .first()
    )


def _record_refund(db: Session, payment: Payment, booking: Booking, amount_paise: int, reason: str) -> int:
    """Issue a Stripe refund and record it (refund row + ledger debit + booking update)."""
    stripe = get_stripe()
    refund = stripe.Refund.create(
        payment_intent=payment.stripe_payment_intent_id,
        amount=amount_paise,
        metadata={"booking_id": str(booking.id), "reason": reason},
    )
    db.add(Refund(
        payment_id=payment.id, booking_id=booking.id, amount_paise=amount_paise,
        reason=reason, status=RefundStatus.succeeded, stripe_refund_id=refund.id,
    ))
    payment.status = PaymentAttemptStatus.refunded
    booking.refund_paise = (booking.refund_paise or 0) + amount_paise
    booking.payment_status = PaymentStatus.refunded

    venue = db.get(Venue, booking.venue_id)
    owner_id = venue.owner_id if venue else booking.user_id
    db.add(LedgerEntry(
        booking_id=booking.id, venue_id=booking.venue_id, owner_id=owner_id,
        user_id=booking.user_id, entry_type="refund", amount_paise=amount_paise,
        direction="debit", stripe_pi_ref=payment.stripe_payment_intent_id,
    ))
    venue_name = venue.name if venue else "your venue"
    notifications.notify(db, booking.user_id, "refund_issued",
                         context={"venue_name": venue_name, "amount_rupees": amount_paise / 100},
                         booking_id=booking.id)
    return amount_paise


def _find_competing_bookings(db: Session, booking: Booking) -> list[Booking]:
    """Other active bookings contending for the same slot.

    MVP overlap rule: same venue + same event_date, still requested/accepted.
    Once the booking module produces booking_slots, this should switch to a
    range-overlap query against effective_starts_at/effective_ends_at.
    """
    q = db.query(Booking).filter(
        Booking.id != booking.id,
        Booking.venue_id == booking.venue_id,
        Booking.status.in_([BookingStatus.requested, BookingStatus.accepted]),
    )
    if booking.event_date is not None:
        q = q.filter(Booking.event_date == booking.event_date)
    return q.with_for_update().all()


def _conflict_cancel(db: Session, competitor: Booking, venue: Venue | None) -> None:
    old = competitor.status.value
    competitor.status = BookingStatus.conflict_canceled
    db.add(BookingStatusHistory(
        booking_id=competitor.id, old_status=old, new_status="conflict_canceled",
        reason="slot_confirmed_by_another",
    ))
    paid = _succeeded_payment(db, competitor.id)
    if paid:
        _record_refund(db, paid, competitor, paid.amount_paise, "conflict_canceled")
    venue_name = venue.name if venue else "the venue"
    notifications.notify(db, competitor.user_id, "conflict_canceled",
                         context={"venue_name": venue_name}, booking_id=competitor.id)


def _conflict_cancel_self_and_refund(db: Session, payment_intent_id: str) -> None:
    """The current booking lost the slot race — cancel it and refund this payment."""
    payment = (
        db.query(Payment)
        .filter(Payment.stripe_payment_intent_id == payment_intent_id)
        .with_for_update()
        .first()
    )
    if not payment:
        return
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).with_for_update().first()
    if not booking:
        return
    venue = db.get(Venue, booking.venue_id)
    old = booking.status.value
    booking.status = BookingStatus.conflict_canceled
    db.add(BookingStatusHistory(
        booking_id=booking.id, old_status=old, new_status="conflict_canceled",
        reason="lost_slot_race",
    ))
    _record_refund(db, payment, booking, payment.amount_paise, "lost_slot_race")
    venue_name = venue.name if venue else "the venue"
    notifications.notify(db, booking.user_id, "conflict_canceled",
                         context={"venue_name": venue_name}, booking_id=booking.id)
