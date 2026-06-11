import logging
from datetime import datetime, timezone

from app.core.database import with_session
from app.modules.booking.models import Booking, BookingStatus, BookingPaymentStatus, StatusHistory
from app.modules.venue.models import Venue
from app.modules.notification import service as notifications

logger = logging.getLogger(__name__)


def run():
    """Mark confirmed bookings completed once the event date has passed and no
    payment is pending. (Dispute/cancellation workflow checks go here too.)
    """
    today = datetime.now(timezone.utc).date()
    completed = 0
    with with_session() as db:
        rows = (
            db.query(Booking)
            .filter(
                Booking.status == BookingStatus.confirmed,
                Booking.payment_status == BookingPaymentStatus.paid,
                Booking.event_date.isnot(None),
                Booking.event_date < today,
            )
            .all()
        )
        for b in rows:
            b.status = BookingStatus.completed
            db.add(StatusHistory(
                booking_id=b.id, old_status="confirmed", new_status="completed",
                reason="booking_completion_job",
            ))
            venue = db.get(Venue, b.venue_id)
            venue_name = venue.name if venue else "your venue"
            notifications.notify(db, b.user_id, "booking_completed",
                                 context={"venue_name": venue_name}, booking_id=b.id)
            completed += 1
        logger.info("booking_completion: completed %d booking(s)", completed)
