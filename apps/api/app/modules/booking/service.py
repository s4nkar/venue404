import logging
import math
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timezone, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.availability.service import validate_booking_request
from app.modules.booking._stubs import (
    cancel_payment_intent,
    create_advance_payment_intent,
    create_balance_payment_intent,
    create_notification,
    initiate_refund,
)
from app.modules.booking.models import (
    Booking,
    BookingSlot,
    BookingStatus,
    BookingStatusHistory,
    BookingType,
    PaymentStatus,
)
from app.modules.booking.schemas import (
    BookingDisplay,
    BookingOut,
    BookingRequestIn,
    CancellationDisplay,
    CancellationPreviewOut,
    ExtendDeadlineIn,
)
from app.modules.venue.models import Venue, VenueCancellationPolicy, VenueStatus
from app.modules.venue.service import _get_active_venue_or_404, get_pricing_quote_for_slot

logger = logging.getLogger(__name__)


TERMINAL_STATUSES = {
    BookingStatus.completed,
    BookingStatus.hold_expired,
    BookingStatus.request_expired,
    BookingStatus.conflict_cancelled,
    BookingStatus.user_cancelled,
    BookingStatus.admin_cancelled,
    BookingStatus.owner_rejected,
    BookingStatus.balance_overdue_cancelled,
}


@dataclass
class RefundComputation:
    refund_amount_paise: int
    penalty_amount_paise: int
    refund_pct_applied: float
    tier_matched: str | None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _format_inr(paise: int) -> str:
    rupees = paise / 100
    return f"INR {rupees:,.0f}"


def _enum_value(value) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _history(
    booking: Booking,
    old_status: BookingStatus | None,
    new_status: BookingStatus,
    changed_by: UUID | None = None,
    reason: str | None = None,
    metadata: dict | None = None,
) -> BookingStatusHistory:
    return BookingStatusHistory(
        id=uuid.uuid4(),
        booking_id=booking.id,
        old_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        reason=reason,
        change_metadata=metadata,
    )


def _booking_or_404(
    db: Session,
    booking_id: UUID,
    for_update: bool = False,
) -> Booking:
    query = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.deleted_at.is_(None),
    )
    if for_update:
        query = query.with_for_update()

    booking = query.first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    return booking


def _assert_booking_user(booking: Booking, user_id: UUID) -> None:
    if booking.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Booking access denied")


def _assert_booking_owner(booking: Booking, owner_id: UUID) -> None:
    if booking.venue.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Booking owner access denied")


def _slot_for_update(db: Session, booking_id: UUID) -> BookingSlot:
    slot = (
        db.query(BookingSlot)
        .filter(
            BookingSlot.booking_id == booking_id,
            BookingSlot.deleted_at.is_(None),
        )
        .with_for_update()
        .first()
    )
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking slot not found")

    return slot


def _booking_out(booking: Booking) -> BookingOut:
    slot = booking.slot
    return BookingOut(
        id=booking.id,
        venue_id=booking.venue_id,
        user_id=booking.user_id,
        booking_type=_enum_value(booking.booking_type),
        status=_enum_value(booking.status),
        payment_status=_enum_value(booking.payment_status),
        starts_at=slot.starts_at,
        ends_at=slot.ends_at,
        effective_starts_at=slot.effective_starts_at,
        effective_ends_at=slot.effective_ends_at,
        guest_count=booking.guest_count,
        event_type=booking.event_type,
        user_notes=booking.user_notes,
        owner_notes=booking.owner_notes,
        quoted_price_paise=booking.quoted_price_paise,
        platform_commission_pct=float(booking.platform_commission_pct),
        platform_fee_paise=booking.platform_fee_paise,
        owner_payout_paise=booking.owner_payout_paise,
        advance_pct=float(booking.advance_pct),
        advance_due_paise=booking.advance_due_paise,
        balance_due_paise=booking.balance_due_paise,
        balance_due_date=booking.balance_due_date,
        hold_expires_at=booking.hold_expires_at,
        confirmed_at=booking.confirmed_at,
        cancelled_at=booking.cancelled_at,
        expired_at=booking.expired_at,
        amount_paid_paise=booking.amount_paid_paise,
        refund_amount_paise=booking.refund_amount_paise,
        stripe_advance_payment_intent_id=booking.stripe_advance_payment_intent_id,
        stripe_balance_payment_intent_id=booking.stripe_balance_payment_intent_id,
        deadline_extension_count=booking.deadline_extension_count,
        balance_overdue_at=booking.balance_overdue_at,
        owner_action_deadline=booking.owner_action_deadline,
        display=BookingDisplay(
            quoted_price=_format_inr(booking.quoted_price_paise),
            advance_due=_format_inr(booking.advance_due_paise),
            balance_due=_format_inr(booking.balance_due_paise),
            platform_fee=_format_inr(booking.platform_fee_paise),
            owner_payout=_format_inr(booking.owner_payout_paise),
        ),
    )


def _load_policy(db: Session, venue_id: UUID) -> VenueCancellationPolicy | None:
    return (
        db.query(VenueCancellationPolicy)
        .filter(VenueCancellationPolicy.venue_id == venue_id)
        .first()
    )


def _compute_refund(
    booking: Booking,
    policy: VenueCancellationPolicy | None,
    cancelled_at: datetime | None = None,
) -> RefundComputation:
    cancelled_at = cancelled_at or _now()
    starts_at = booking.slot.starts_at
    paid_amount = booking.amount_paid_paise

    if paid_amount <= 0:
        return RefundComputation(0, 0, 0.0, None)

    hours_notice = (starts_at - cancelled_at).total_seconds() / 3600
    refund_pct = 0.0
    tier = "no_show"

    if policy:
        tiers = [
            ("tier_1", policy.tier_1_hours, policy.tier_1_refund_pct),
            ("tier_2", policy.tier_2_hours, policy.tier_2_refund_pct),
            ("tier_3", policy.tier_3_hours, policy.tier_3_refund_pct),
        ]
        for tier_name, hours, pct in tiers:
            if hours is not None and pct is not None and hours_notice >= hours:
                tier = tier_name
                refund_pct = float(pct)
                break
        else:
            refund_pct = float(policy.no_show_refund_pct)
    else:
        tier = None

    refund_amount = round(paid_amount * refund_pct / 100)
    if policy and not policy.platform_fee_refundable:
        refundable_cap = max(0, paid_amount - booking.platform_fee_paise)
        refund_amount = min(refund_amount, refundable_cap)

    penalty_amount = max(0, paid_amount - refund_amount)
    return RefundComputation(
        refund_amount_paise=refund_amount,
        penalty_amount_paise=penalty_amount,
        refund_pct_applied=refund_pct,
        tier_matched=tier,
    )


def create_booking_request(
    db: Session,
    user_id: UUID,
    payload: BookingRequestIn,
) -> BookingOut:
    venue = (
        db.query(Venue)
        .filter(
            Venue.id == payload.venue_id,
            Venue.status == VenueStatus.approved,
            Venue.is_active.is_(True),
            Venue.deleted_at.is_(None),
        )
        .with_for_update(read=True)
        .first()
    )
    if not venue:
        _get_active_venue_or_404(db, payload.venue_id)

    validation = validate_booking_request(
        db=db,
        venue=venue,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        booking_type=payload.booking_type,
        booking_date=payload.booking_date,
        guest_count=payload.guest_count,
    )

    starts_at = validation.effective_starts_at + timedelta(minutes=venue.pre_buffer_minutes)
    ends_at = validation.effective_ends_at - timedelta(minutes=venue.post_buffer_minutes)
    quote = get_pricing_quote_for_slot(
        db=db,
        venue_id=venue.id,
        starts_at=starts_at,
        ends_at=ends_at,
        booking_type=payload.booking_type,
    )

    booking = Booking(
        id=uuid.uuid4(),
        venue_id=venue.id,
        user_id=user_id,
        booking_type=BookingType(payload.booking_type),
        event_type=payload.event_type,
        guest_count=payload.guest_count,
        user_notes=payload.user_notes,
        status=BookingStatus.requested,
        balance_due_date=starts_at.date() - timedelta(days=venue.balance_due_days_before_event),
        pricing_mode=quote.pricing_mode,
        quoted_price_paise=quote.quoted_price_paise,
        platform_commission_pct=quote.platform_commission_pct,
        platform_fee_paise=quote.platform_fee_paise,
        owner_payout_paise=quote.owner_payout_paise,
        advance_pct=quote.advance_pct,
        advance_due_paise=quote.advance_due_paise,
        balance_due_paise=quote.balance_due_paise,
        overdue_advance_refund_pct=venue.overdue_advance_refund_pct,
        payment_status=PaymentStatus.unpaid,
    )
    db.add(booking)
    db.flush()

    slot = BookingSlot(
        id=uuid.uuid4(),
        booking_id=booking.id,
        venue_id=venue.id,
        starts_at=starts_at,
        ends_at=ends_at,
        effective_starts_at=validation.effective_starts_at,
        effective_ends_at=validation.effective_ends_at,
        is_blocking=False,
    )
    db.add(slot)
    db.add(_history(booking, None, BookingStatus.requested, changed_by=user_id))
    db.flush()
    db.refresh(booking)

    create_notification(
        venue.owner_id,
        booking.id,
        "booking_requested",
        "New booking request",
        "A customer requested your venue.",
    )
    return _booking_out(booking)


def get_booking(db: Session, booking_id: UUID, user_id: UUID | None = None) -> BookingOut:
    booking = _booking_or_404(db, booking_id)
    if user_id is not None and booking.user_id != user_id and booking.venue.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Booking access denied")

    return _booking_out(booking)


def list_user_bookings(db: Session, user_id: UUID) -> list[BookingOut]:
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user_id, Booking.deleted_at.is_(None))
        .order_by(Booking.created_at.desc())
        .all()
    )
    return [_booking_out(booking) for booking in bookings]


def list_venue_bookings(
    db: Session,
    venue_id: UUID,
    owner_id: UUID,
    pending_only: bool = False,
) -> list[BookingOut]:
    venue = _get_active_venue_or_404(db, venue_id)
    if venue.owner_id != owner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Venue owner access denied")

    query = db.query(Booking).filter(
        Booking.venue_id == venue_id,
        Booking.deleted_at.is_(None),
    )
    if pending_only:
        query = query.filter(Booking.status == BookingStatus.requested)

    return [_booking_out(booking) for booking in query.order_by(Booking.requested_at.asc()).all()]


def owner_accept_booking(db: Session, booking_id: UUID, owner_id: UUID) -> BookingOut:
    booking = _booking_or_404(db, booking_id, for_update=True)
    _assert_booking_owner(booking, owner_id)
    if booking.status != BookingStatus.requested:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is not pending")

    slot = _slot_for_update(db, booking.id)
    old_status = booking.status
    slot.is_blocking = True
    booking.status = BookingStatus.owner_accepted
    booking.owner_responded_at = _now()
    booking.hold_expires_at = booking.owner_responded_at + timedelta(hours=24)

    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        if "booking_slots_no_overlap" in str(exc.orig):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot already blocked") from exc
        raise

    booking.stripe_advance_payment_intent_id = create_advance_payment_intent(booking)
    db.add(_history(booking, old_status, BookingStatus.owner_accepted, changed_by=owner_id))
    db.flush()
    db.refresh(booking)

    create_notification(
        booking.user_id,
        booking.id,
        "booking_accepted",
        "Booking accepted",
        "The venue owner accepted your request. Please pay the advance within 24 hours.",
    )
    return _booking_out(booking)


def owner_reject_booking(
    db: Session,
    booking_id: UUID,
    owner_id: UUID,
    reason: str,
) -> BookingOut:
    booking = _booking_or_404(db, booking_id, for_update=True)
    _assert_booking_owner(booking, owner_id)
    if booking.status != BookingStatus.requested:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is not pending")

    old_status = booking.status
    booking.status = BookingStatus.owner_rejected
    booking.owner_responded_at = _now()
    db.add(_history(booking, old_status, BookingStatus.owner_rejected, changed_by=owner_id, reason=reason))
    db.flush()
    db.refresh(booking)

    create_notification(
        booking.user_id,
        booking.id,
        "booking_rejected",
        "Booking rejected",
        reason,
    )
    return _booking_out(booking)


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

    old_status = booking.status
    booking.status = BookingStatus.confirmed
    booking.confirmed_at = _now()
    booking.amount_paid_paise = booking.advance_due_paise
    booking.payment_status = (
        PaymentStatus.fully_paid if booking.balance_due_paise == 0 else PaymentStatus.advance_paid
    )
    db.add(_history(booking, old_status, BookingStatus.confirmed, metadata={"stripe_event_id": stripe_event_id}))

    slot = booking.slot
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
    for conflict in conflicts:
        conflict_old_status = conflict.status
        conflict.status = BookingStatus.conflict_cancelled
        conflict.cancelled_at = _now()
        db.add(_history(conflict, conflict_old_status, BookingStatus.conflict_cancelled))

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


def get_cancellation_preview(
    db: Session,
    booking_id: UUID,
    user_id: UUID,
) -> CancellationPreviewOut:
    booking = _booking_or_404(db, booking_id)
    _assert_booking_user(booking, user_id)
    if booking.status not in (BookingStatus.owner_accepted, BookingStatus.confirmed):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking cannot be cancelled")

    refund = _compute_refund(booking, _load_policy(db, booking.venue_id))
    return CancellationPreviewOut(
        refund_amount_paise=refund.refund_amount_paise,
        penalty_amount_paise=refund.penalty_amount_paise,
        refund_pct_applied=refund.refund_pct_applied,
        tier_matched=refund.tier_matched,
        display=CancellationDisplay(
            refund_amount=_format_inr(refund.refund_amount_paise),
            penalty_amount=_format_inr(refund.penalty_amount_paise),
        ),
    )


def user_cancel_booking(db: Session, booking_id: UUID, user_id: UUID) -> BookingOut:
    booking = _booking_or_404(db, booking_id, for_update=True)
    _assert_booking_user(booking, user_id)
    if booking.status not in (BookingStatus.owner_accepted, BookingStatus.confirmed):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking cannot be cancelled")

    old_status = booking.status
    slot = _slot_for_update(db, booking.id)
    slot.is_blocking = False
    booking.status = BookingStatus.user_cancelled
    booking.cancelled_at = _now()

    metadata = None
    if old_status == BookingStatus.owner_accepted:
        cancel_payment_intent(booking.stripe_advance_payment_intent_id)
    else:
        refund = _compute_refund(booking, _load_policy(db, booking.venue_id), booking.cancelled_at)
        if refund.refund_amount_paise > 0:
            initiate_refund(booking, refund.refund_amount_paise)
        booking.refund_amount_paise = refund.refund_amount_paise
        if refund.refund_amount_paise == 0:
            booking.payment_status = PaymentStatus.refunded if booking.amount_paid_paise == 0 else booking.payment_status
        elif refund.refund_amount_paise >= booking.amount_paid_paise:
            booking.payment_status = PaymentStatus.refunded
        else:
            booking.payment_status = PaymentStatus.partially_refunded
        metadata = {
            "refund_amount_paise": refund.refund_amount_paise,
            "penalty_amount_paise": refund.penalty_amount_paise,
            "refund_pct_applied": refund.refund_pct_applied,
            "tier_matched": refund.tier_matched,
        }

    db.add(_history(booking, old_status, BookingStatus.user_cancelled, changed_by=user_id, metadata=metadata))
    db.flush()
    db.refresh(booking)
    create_notification(booking.venue.owner_id, booking.id, "booking_cancelled", "Booking cancelled", "The customer cancelled a booking.")
    return _booking_out(booking)


def owner_extend_deadline(
    db: Session,
    booking_id: UUID,
    owner_id: UUID,
    body: ExtendDeadlineIn,
) -> BookingOut:
    booking = _booking_or_404(db, booking_id, for_update=True)
    _assert_booking_owner(booking, owner_id)
    if (
        booking.status != BookingStatus.confirmed
        or booking.payment_status != PaymentStatus.advance_paid
        or booking.balance_overdue_at is None
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is not balance overdue")
    if booking.deadline_extension_count >= 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Deadline extension limit reached")
    if body.new_due_date <= date.today() or body.new_due_date >= booking.slot.starts_at.date():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid new due date")

    booking.balance_due_date = body.new_due_date
    booking.deadline_extension_count += 1
    booking.balance_overdue_at = None
    booking.owner_action_deadline = None
    db.add(_history(
        booking,
        booking.status,
        booking.status,
        changed_by=owner_id,
        metadata={"new_due_date": body.new_due_date.isoformat()},
    ))
    db.flush()
    db.refresh(booking)
    create_notification(booking.user_id, booking.id, "balance_deadline_extended", "Balance deadline extended", "Your balance payment deadline was extended.")
    return _booking_out(booking)


def owner_cancel_forfeit(db: Session, booking_id: UUID, owner_id: UUID) -> BookingOut:
    booking = _booking_or_404(db, booking_id, for_update=True)
    _assert_booking_owner(booking, owner_id)
    if booking.status != BookingStatus.confirmed or booking.balance_overdue_at is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is not balance overdue")

    _slot_for_update(db, booking.id).is_blocking = False
    old_status = booking.status
    owner_share = math.floor(
        booking.advance_due_paise * (1 - (float(booking.platform_commission_pct) / 100))
    )
    booking.status = BookingStatus.balance_overdue_cancelled
    booking.cancelled_at = _now()
    db.add(_history(
        booking,
        old_status,
        BookingStatus.balance_overdue_cancelled,
        changed_by=owner_id,
        metadata={"owner_share_paise": owner_share, "refund_amount_paise": 0},
    ))
    db.flush()
    db.refresh(booking)
    create_notification(booking.user_id, booking.id, "booking_cancelled", "Booking cancelled", "Your booking was cancelled after the balance became overdue.")
    return _booking_out(booking)


def owner_cancel_goodwill(db: Session, booking_id: UUID, owner_id: UUID) -> BookingOut:
    booking = _booking_or_404(db, booking_id, for_update=True)
    _assert_booking_owner(booking, owner_id)
    if booking.status != BookingStatus.confirmed or booking.balance_overdue_at is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is not balance overdue")

    _slot_for_update(db, booking.id).is_blocking = False
    old_status = booking.status
    refund_amount = math.floor(
        booking.advance_due_paise * (float(booking.overdue_advance_refund_pct) / 100)
    )
    if refund_amount > 0:
        initiate_refund(booking, refund_amount)

    booking.status = BookingStatus.user_cancelled
    booking.cancelled_at = _now()
    booking.refund_amount_paise = refund_amount
    booking.payment_status = PaymentStatus.partially_refunded if refund_amount > 0 else booking.payment_status
    db.add(_history(
        booking,
        old_status,
        BookingStatus.user_cancelled,
        changed_by=owner_id,
        metadata={"refund_amount_paise": refund_amount, "goodwill": True},
    ))
    db.flush()
    db.refresh(booking)
    create_notification(booking.user_id, booking.id, "booking_cancelled", "Booking cancelled", "Your overdue booking was cancelled with a goodwill refund.")
    return _booking_out(booking)


def admin_force_cancel(
    db: Session,
    booking_id: UUID,
    admin_id: UUID,
    reason: str,
) -> BookingOut:
    booking = _booking_or_404(db, booking_id, for_update=True)
    if booking.status in TERMINAL_STATUSES:
        return _booking_out(booking)

    old_status = booking.status
    if booking.slot:
        booking.slot.is_blocking = False
    booking.status = BookingStatus.admin_cancelled
    booking.cancelled_at = _now()
    db.add(_history(booking, old_status, BookingStatus.admin_cancelled, changed_by=admin_id, reason=reason))
    db.flush()
    db.refresh(booking)
    return _booking_out(booking)


def create_booking(user_id: UUID, body: BookingRequestIn, db: Session) -> BookingOut:
    return create_booking_request(db, user_id, body)
