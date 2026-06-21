import logging
from datetime import datetime, timezone, timedelta

from app.core.database import with_session
from app.modules.booking.models import (
    Booking, BookingStatus, PaymentStatus, BookingStatusHistory,
)
from app.modules.venue.models import Venue
from app.modules.notification import service as notifications

logger = logging.getLogger(__name__)

DEFAULT_ACTION_WINDOW_HOURS = 48


def run_flag():
    """Flag confirmed-but-balance-unpaid bookings whose balance due date has
    passed, opening the owner-action window (extend / forfeit / goodwill).
    """
    now = datetime.now(timezone.utc)
    today = now.date()
    flagged = 0
    with with_session() as db:
        rows = (
            db.query(Booking)
            .filter(
                Booking.status == BookingStatus.confirmed,
                Booking.payment_status == PaymentStatus.advance_paid,
                Booking.balance_due_date.isnot(None),
                Booking.balance_due_date < today,
                Booking.balance_overdue_at.is_(None),
            )
            .all()
        )
        for b in rows:
            venue = db.get(Venue, b.venue_id)
            window = venue.owner_action_window_hours if venue else DEFAULT_ACTION_WINDOW_HOURS
            b.balance_overdue_at = now
            b.owner_action_deadline = now + timedelta(hours=window)
            venue_name = venue.name if venue else "your venue"
            notifications.notify(db, b.user_id, "balance_overdue",
                                 context={"venue_name": venue_name}, booking_id=b.id)
            if venue:
                notifications.notify(db, venue.owner_id, "balance_overdue",
                                     context={"venue_name": venue_name}, booking_id=b.id)
            flagged += 1
        logger.info("balance_overdue_flag: flagged %d booking(s)", flagged)


def run_autocancel():
    """Auto-cancel bookings whose owner-action window expired without the owner
    extending the deadline or otherwise acting on the overdue balance.
    """
    now = datetime.now(timezone.utc)
    cancelled = 0
    with with_session() as db:
        rows = (
            db.query(Booking)
            .filter(
                Booking.status == BookingStatus.confirmed,
                Booking.payment_status == PaymentStatus.advance_paid,
                Booking.balance_overdue_at.isnot(None),
                Booking.owner_action_deadline.isnot(None),
                Booking.owner_action_deadline < now,
            )
            .all()
        )
        for b in rows:
            old = b.status
            b.status = BookingStatus.balance_overdue_cancelled
            b.cancelled_at = now
            if b.slot:
                b.slot.is_blocking = False
            db.add(BookingStatusHistory(
                booking_id=b.id, old_status=old,
                new_status=BookingStatus.balance_overdue_cancelled,
                reason="balance_overdue_autocancel_job",
            ))
            venue = db.get(Venue, b.venue_id)
            venue_name = venue.name if venue else "your venue"
            notifications.notify(db, b.user_id, "booking_canceled",
                                 context={"venue_name": venue_name}, booking_id=b.id)
            cancelled += 1
        logger.info("balance_overdue_autocancel: cancelled %d booking(s)", cancelled)
