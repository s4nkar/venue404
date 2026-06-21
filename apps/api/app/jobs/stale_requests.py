import logging
from datetime import datetime, timezone, timedelta

from app.core.database import with_session
from app.modules.booking.models import Booking, BookingStatus, BookingStatusHistory
from app.modules.venue.models import Venue
from app.modules.notification import service as notifications

logger = logging.getLogger(__name__)

STALE_AFTER = timedelta(days=7)


def run():
    """Auto-expire booking requests that have been pending (requested) for 7 days."""
    now = datetime.now(timezone.utc)
    cutoff = now - STALE_AFTER
    expired = 0
    with with_session() as db:
        rows = (
            db.query(Booking)
            .filter(
                Booking.status == BookingStatus.requested,
                Booking.requested_at < cutoff,
            )
            .all()
        )
        for b in rows:
            b.status = BookingStatus.request_expired
            b.expired_at = now
            db.add(BookingStatusHistory(
                booking_id=b.id, old_status=BookingStatus.requested,
                new_status=BookingStatus.request_expired, reason="stale_requests_job",
            ))
            venue = db.get(Venue, b.venue_id)
            venue_name = venue.name if venue else "the venue"
            notifications.notify(db, b.user_id, "booking_canceled",
                                 context={"venue_name": venue_name}, booking_id=b.id)
            expired += 1
        logger.info("stale_requests: expired %d request(s)", expired)
