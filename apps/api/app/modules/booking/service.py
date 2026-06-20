import logging
import uuid
from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.availability.service import validate_booking_request
from app.modules.notification import service as notifications
from app.modules.booking.helpers import (
    _now,
    _history,
    _booking_or_404,
    _assert_booking_owner,
    _slot_for_update,
    _booking_out,
    MAX_DEADLINE_EXTENSIONS,
    USER_PAYMENT_HOLD_HOURS,
)
from app.modules.booking.models import (
    Booking,
    BookingSlot,
    BookingStatus,
    BookingType,
    PaymentStatus,
)
from app.modules.booking.schemas import (
    BookingOut,
    BookingRequestIn,
    ExtendDeadlineIn,
)
from app.modules.venue.models import Venue, VenueStatus
from app.modules.venue.service import ( get_pricing_quote_for_slot,  _get_active_venue_or_404 )

# Re-expose functions from cancellation module
from app.modules.booking.cancellation import (
    _compute_refund,
    get_cancellation_preview,
    user_cancel_booking,
    owner_cancel_forfeit,
    owner_cancel_goodwill,
    admin_force_cancel,
)

logger = logging.getLogger(__name__)


def create_booking_request(
    db: Session,
    user_id: UUID,
    payload: BookingRequestIn,
) -> BookingOut:
    # Acquire exclusive write lock on Venue to serialize slot check and creation
    venue = _get_active_venue_or_404(
        db,
        payload.venue_id,
        for_update=True,
    )
    
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

    notifications.notify(
        db,
        venue.owner_id,
        "new_request_owner",
        context={"venue_name": venue.name},
        booking_id=booking.id,
    )
    notifications.notify(
        db,
        booking.user_id,
        "request_received",
        context={"venue_name": venue.name},
        booking_id=booking.id,
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
    from app.modules.venue.service import _get_active_venue_or_404
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

    # Idempotency: If already accepted, return current state
    if booking.status == BookingStatus.owner_accepted:
        db.refresh(booking)
        return _booking_out(booking)

    if booking.status != BookingStatus.requested:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking is not pending")

    slot = _slot_for_update(db, booking.id)
    old_status = booking.status
    # Acceptance does NOT reserve the slot (CLAUDE.md): the slot is blocked only
    # once the token advance is paid. Multiple requesters may be accepted; the
    # first to pay wins and the rest are conflict-cancelled at confirmation time.
    slot.is_blocking = False
    booking.status = BookingStatus.owner_accepted
    booking.owner_responded_at = _now()
    booking.hold_expires_at = booking.owner_responded_at + timedelta(hours=USER_PAYMENT_HOLD_HOURS)

    db.add(_history(booking, old_status, BookingStatus.owner_accepted, changed_by=owner_id))
    db.flush()
    db.refresh(booking)

    notifications.notify(
        db,
        booking.user_id,
        "request_accepted",
        context={"venue_name": booking.venue.name},
        booking_id=booking.id,
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

    notifications.notify(
        db,
        booking.user_id,
        "booking_rejected",
        context={"venue_name": booking.venue.name, "reason": reason},
        booking_id=booking.id,
    )
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
    if booking.deadline_extension_count >= MAX_DEADLINE_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Deadline extension limit reached")

    # Ensure event has not already started
    if booking.slot.starts_at <= _now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot extend deadline for a past or ongoing event")

    # Ensure new due date is in the future and before the event date
    if body.new_due_date <= date.today():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New due date must be in the future")
    if body.new_due_date >= booking.slot.starts_at.date():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New due date must be before the event date")

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
    notifications.notify(
        db,
        booking.user_id,
        "balance_deadline_extended",
        context={"venue_name": booking.venue.name},
        booking_id=booking.id,
    )
    return _booking_out(booking)


def create_booking(user_id: UUID, body: BookingRequestIn, db: Session) -> BookingOut:
    return create_booking_request(db, user_id, body)
