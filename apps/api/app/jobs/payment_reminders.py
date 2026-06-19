import logging
from datetime import datetime, timezone, date

from app.core.database import with_session
from app.modules.booking.models import Booking, BookingStatus
from app.modules.venue.models import Venue
from app.modules.notification import service as notifications

logger = logging.getLogger(__name__)

REMINDER_DAYS = {7, 3, 1}


def run():
    """Send payment reminders at T-7, T-3, and T-1 days before the event for
    bookings that are accepted but still unpaid (hold not yet expired).
    """
    now = datetime.now(timezone.utc)
    today = now.date()
    sent = 0
    with with_session() as db:
        rows = (
            db.query(Booking)
            .filter(
                Booking.status == BookingStatus.owner_accepted,
                Booking.hold_expires_at.isnot(None),
                Booking.hold_expires_at > now,
            )
            .all()
        )
        for b in rows:
            if not b.slot:
                continue
            days_until = (b.slot.starts_at.date() - today).days
            if days_until in REMINDER_DAYS:
                venue = db.get(Venue, b.venue_id)
                venue_name = venue.name if venue else "your venue"
                notifications.notify(db, b.user_id, "payment_reminder",
                                     context={"venue_name": venue_name, "days_until": days_until},
                                     booking_id=b.id)
                sent += 1
        logger.info("payment_reminders: sent %d reminder(s)", sent)
