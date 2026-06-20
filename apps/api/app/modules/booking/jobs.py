from datetime import date, datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.modules.venue.models import Venue
from app.modules.booking._stubs import create_notification
from app.modules.booking.models import Booking, BookingSlot, BookingStatus, BookingStatusHistory, PaymentStatus


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _history(booking: Booking, old_status: BookingStatus, new_status: BookingStatus, reason: str) -> BookingStatusHistory:
    return BookingStatusHistory(
        booking_id=booking.id,
        old_status=old_status,
        new_status=new_status,
        reason=reason,
    )


def run_hold_expiry_job(db: Session, limit: int = 100) -> int:
    bookings = (
        db.query(Booking)
        .filter(
            Booking.status == BookingStatus.owner_accepted,
            Booking.hold_expires_at < _now(),
            Booking.deleted_at.is_(None),
        )
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )

    for booking in bookings:
        old_status = booking.status
        if booking.slot:
            booking.slot.is_blocking = False
        booking.status = BookingStatus.hold_expired
        booking.expired_at = _now()
        db.add(_history(booking, old_status, BookingStatus.hold_expired, "hold_expired"))
        create_notification(
            booking.venue.owner_id,
            booking.id,
            "hold_expired",
            "Booking hold expired",
            "A customer's advance payment hold expired.",
        )

    db.flush()
    return len(bookings)


def run_request_expiry_job(db: Session, limit: int = 100) -> int:
    cutoff = _now() - timedelta(days=7)
    bookings = (
        db.query(Booking)
        .filter(
            Booking.status == BookingStatus.requested,
            Booking.requested_at < cutoff,
            Booking.deleted_at.is_(None),
        )
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )

    for booking in bookings:
        old_status = booking.status
        booking.status = BookingStatus.request_expired
        booking.expired_at = _now()
        db.add(_history(booking, old_status, BookingStatus.request_expired, "request_expired"))

    db.flush()
    return len(bookings)


def run_balance_overdue_flag_job(db: Session, limit: int = 100) -> int:
    today = date.today()
    bookings = (
        db.query(Booking)
        .filter(
            Booking.status == BookingStatus.confirmed,
            Booking.payment_status == PaymentStatus.advance_paid,
            Booking.balance_due_date < today,
            Booking.balance_overdue_at.is_(None),
            Booking.deleted_at.is_(None),
        )
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )

    for booking in bookings:
        booking.balance_overdue_at = _now()
        booking.owner_action_deadline = booking.balance_overdue_at + timedelta(
            hours=booking.venue.owner_action_window_hours,
        )
        create_notification(
            booking.venue.owner_id,
            booking.id,
            "balance_overdue",
            "Balance overdue",
            "A confirmed booking has an overdue balance.",
        )
        create_notification(
            booking.user_id,
            booking.id,
            "balance_overdue",
            "Balance overdue",
            "Your booking balance is overdue.",
        )

    db.flush()
    return len(bookings)


def run_balance_overdue_autocancel_job(db: Session, limit: int = 100) -> int:
    bookings = (
        db.query(Booking)
        .filter(
            Booking.status == BookingStatus.confirmed,
            Booking.payment_status == PaymentStatus.advance_paid,
            Booking.owner_action_deadline < _now(),
            Booking.deleted_at.is_(None),
        )
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )

    for booking in bookings:
        old_status = booking.status
        if booking.slot:
            booking.slot.is_blocking = False
        booking.status = BookingStatus.balance_overdue_cancelled
        booking.cancelled_at = _now()
        db.add(_history(
            booking,
            old_status,
            BookingStatus.balance_overdue_cancelled,
            "balance_overdue_autocancel",
        ))
        create_notification(
            booking.user_id,
            booking.id,
            "booking_cancelled",
            "Booking cancelled",
            "Your booking was cancelled after the balance remained overdue.",
        )

    db.flush()
    return len(bookings)


def run_booking_completion_job(db: Session, limit: int = 100) -> int:
    bookings = (
        db.query(Booking)
        .join(BookingSlot, BookingSlot.booking_id == Booking.id)
        .filter(
            Booking.status == BookingStatus.confirmed,
            Booking.payment_status == PaymentStatus.fully_paid,
            BookingSlot.effective_ends_at < _now(),
            Booking.deleted_at.is_(None),
            BookingSlot.deleted_at.is_(None),
        )
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )

    for booking in bookings:
        old_status = booking.status
        if booking.slot:
            booking.slot.is_blocking = False
        booking.status = BookingStatus.completed
        booking.completed_at = _now()
        db.add(_history(booking, old_status, BookingStatus.completed, "booking_completed"))

    db.flush()
    return len(bookings)
