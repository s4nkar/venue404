import logging
from sqlalchemy.orm import Session

from app.modules.booking._stubs import (
    create_balance_payment_intent,
    create_notification,
)
from app.modules.booking.helpers import (
    _now,
    _history,
)
from app.modules.booking.models import (
    Booking,
    BookingSlot,
    BookingStatus,
    PaymentStatus,
)

logger = logging.getLogger(__name__)


def handle_advance_payment_captured(
    db: Session,
    payment_intent_id: str,
    stripe_event_id: str,
) -> None:
    booking = (
        db.query(Booking)
        .filter(
            Booking.stripe_advance_payment_intent_id == payment_intent_id,
            Booking.deleted_at.is_(None),
        )
        .with_for_update()
        .first()
    )
    if not booking:
        logger.warning("Advance payment captured for unknown PI %s", payment_intent_id)
        return

    if booking.status != BookingStatus.owner_accepted or (
        booking.hold_expires_at and booking.hold_expires_at <= _now()
    ):
        logger.warning("Ignoring advance payment for stale booking %s event=%s", booking.id, stripe_event_id)
        return

    slot = booking.slot

    # Step 1: Find and lock conflicts FIRST
    conflicts = (
        db.query(Booking)
        .join(BookingSlot, BookingSlot.booking_id == Booking.id)
        .filter(
            Booking.venue_id == booking.venue_id,
            Booking.id != booking.id,
            Booking.status == BookingStatus.requested,
            Booking.deleted_at.is_(None),
            BookingSlot.deleted_at.is_(None),
            BookingSlot.effective_starts_at < slot.effective_ends_at,
            BookingSlot.effective_ends_at > slot.effective_starts_at,
        )
        .with_for_update()
        .all()
    )

    # Step 2: Cancel all conflicts
    for conflict in conflicts:
        conflict_old_status = conflict.status
        conflict.status = BookingStatus.conflict_cancelled
        conflict.cancelled_at = _now()
        db.add(_history(conflict, conflict_old_status, BookingStatus.conflict_cancelled))

    # Step 3: Now confirm the booking
    old_status = booking.status
    booking.status = BookingStatus.confirmed
    booking.confirmed_at = _now()
    booking.amount_paid_paise = booking.advance_due_paise
    booking.payment_status = (
        PaymentStatus.fully_paid if booking.balance_due_paise == 0 else PaymentStatus.advance_paid
    )
    db.add(_history(booking, old_status, BookingStatus.confirmed, metadata={"stripe_event_id": stripe_event_id}))

    if booking.balance_due_paise > 0:
        booking.stripe_balance_payment_intent_id = create_balance_payment_intent(booking)

    db.flush()
    create_notification(booking.user_id, booking.id, "booking_confirmed", "Booking confirmed", "Your advance payment was received.")
    create_notification(booking.venue.owner_id, booking.id, "booking_confirmed", "Booking confirmed", "A booking was confirmed.")


def handle_balance_payment_captured(
    db: Session,
    payment_intent_id: str,
    stripe_event_id: str,
) -> None:
    booking = (
        db.query(Booking)
        .filter(
            Booking.stripe_balance_payment_intent_id == payment_intent_id,
            Booking.deleted_at.is_(None),
        )
        .with_for_update()
        .first()
    )
    if not booking:
        logger.warning("Balance payment captured for unknown PI %s", payment_intent_id)
        return

    booking.payment_status = PaymentStatus.fully_paid
    booking.amount_paid_paise = booking.quoted_price_paise
    db.add(_history(booking, booking.status, booking.status, metadata={"stripe_event_id": stripe_event_id}))
    db.flush()
    create_notification(booking.user_id, booking.id, "balance_paid", "Balance paid", "Your booking is fully paid.")
