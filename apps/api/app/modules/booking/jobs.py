import logging
from datetime import date, datetime, timezone, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.database import with_session  # if you prefer context manager
from app.modules.venue.models import Venue
from app.modules.booking._stubs import create_notification
from app.modules.booking.models import (
    Booking,
    BookingSlot,
    BookingStatus,
    BookingStatusHistory,
    PaymentStatus,
)

# Assume these services exist (create stubs if needed)
# from app.modules.ledger.service import create_ledger_entry
# from app.modules.payment.stripe_service import initiate_refund
# from app.modules.payout.service import create_payout_request

logger = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _history(
    booking: Booking,
    old_status: BookingStatus | None,
    new_status: BookingStatus,
    reason: str,
) -> BookingStatusHistory:
    return BookingStatusHistory(
        booking_id=booking.id,
        old_status=old_status,
        new_status=new_status,
        reason=reason,
        # changed_by=None for system jobs
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

        db.add(
            _history(booking, old_status, BookingStatus.hold_expired, "hold_expired")
        )

        # Enhanced notification (merged from old version)
        venue_name = booking.venue.name if booking.venue else "your venue"
        create_notification(
            booking.venue.owner_id,
            booking.id,
            "hold_expired",
            "Booking hold expired",
            f"A customer's advance payment hold expired for {venue_name}.",
            # metadata={"remaining_requesters": get_remaining_requesters(booking)}
        )

    db.flush()
    count = len(bookings)
    logger.info("hold_expiry_job: processed %d booking(s)", count)
    return count


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
        db.add(
            _history(
                booking, old_status, BookingStatus.request_expired, "request_expired"
            )
        )

        # Merged notification
        venue_name = booking.venue.name if booking.venue else "the venue"
        create_notification(
            booking.user_id,
            booking.id,
            "booking_canceled",  # or "request_expired"
            "Booking request expired",
            f"Your request for {venue_name} has expired.",
        )

    db.flush()
    count = len(bookings)
    logger.info("request_expiry_job: expired %d request(s)", count)
    return count


def run_balance_due_reminders_job(db: Session, limit: int = 200) -> int:
    """New: Daily reminders (T-7, T-3, T-1) per spec §24."""
    today = date.today()
    bookings = (
        db.query(Booking)
        .filter(
            Booking.status
            == BookingStatus.confirmed,  # or owner_accepted as per old code
            Booking.payment_status.in_(
                [PaymentStatus.unpaid, PaymentStatus.advance_paid]
            ),
            Booking.balance_due_date.isnot(None),
            Booking.deleted_at.is_(None),
        )
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )

    sent = 0
    for booking in bookings:
        if not booking.balance_due_date:
            continue
        days_until = (booking.balance_due_date - today).days
        if days_until in {7, 3, 1}:
            # TODO: Check existing notification to avoid duplicates (idempotency)
            venue_name = booking.venue.name if booking.venue else "your venue"
            create_notification(
                booking.user_id,
                booking.id,
                "balance_due_reminder",
                f"Balance due in {days_until} days",
                f"Pay the balance for {venue_name} before the deadline.",
            )
            sent += 1

    db.flush()
    logger.info("balance_reminders_job: sent %d reminder(s)", sent)
    return sent


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
            hours=booking.venue.owner_action_window_hours or 48
        )
        venue_name = booking.venue.name if booking.venue else "your venue"
        create_notification(
            booking.venue.owner_id,
            booking.id,
            "balance_overdue",
            "Balance overdue",
            f"Balance overdue for {venue_name}.",
        )
        create_notification(
            booking.user_id,
            booking.id,
            "balance_overdue",
            "Balance overdue",
            "Your booking balance is overdue.",
        )

    db.flush()
    count = len(bookings)
    logger.info("balance_overdue_flag_job: flagged %d booking(s)", count)
    return count


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

        refund_pct = Decimal(str(booking.overdue_advance_refund_pct))
        advance_paid = booking.amount_paid_paise
        refund_amount = int(advance_paid * refund_pct / 100)
        forfeited = advance_paid - refund_amount

        booking.status = BookingStatus.balance_overdue_cancelled
        booking.cancelled_at = _now()
        booking.payment_status = (
            PaymentStatus.partially_refunded
            if refund_amount > 0
            else PaymentStatus.advance_paid
        )
        booking.refund_amount_paise = refund_amount

        db.add(
            _history(
                booking,
                old_status,
                BookingStatus.balance_overdue_cancelled,
                "balance_overdue_autocancel",
            )
        )

        # Ledger + Stripe (critical - implement services)
        # if refund_amount > 0:
        #     initiate_refund(...)
        #     create_ledger_entry(booking, "refund_issued", refund_amount, ...)
        # create_ledger_entry(booking, "advance_forfeited", forfeited, ...)
        # owner_share = ...  # commission logic
        # if owner_share: create_ledger_entry(...) + create_payout_request(...)

        venue_name = booking.venue.name if booking.venue else "the venue"
        create_notification(
            booking.user_id,
            booking.id,
            "booking_cancelled",
            "Booking cancelled",
            f"Your booking for {venue_name} was cancelled due to unpaid balance.",
        )

    db.flush()
    count = len(bookings)
    logger.info("balance_overdue_autocancel_job: cancelled %d booking(s)", count)
    return count


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

        db.add(
            _history(booking, old_status, BookingStatus.completed, "booking_completed")
        )

        # Spec required financials
        # create_ledger_entry(booking, "payout_initiated", booking.owner_payout_paise, ...)
        # create_payout_request(booking, booking.owner_payout_paise)

    db.flush()
    count = len(bookings)
    logger.info("booking_completion_job: completed %d booking(s)", count)
    return count
