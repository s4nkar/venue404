import logging
from datetime import datetime, timezone

from app.core.database import with_session
from app.modules.booking.models import Booking, BookingStatus, BookingPaymentStatus, StatusHistory
from app.modules.venue.models import Venue
from app.modules.notification import service as notifications

logger = logging.getLogger(__name__)


def run():
    """Cancel bookings whose 24-hour advance payment window has expired."""
    now = datetime.now(timezone.utc)
    with with_session() as db:
        rows = (
            db.query(Booking)
            .filter(
                Booking.status == BookingStatus.accepted,
                Booking.hold_expires_at.isnot(None),
                Booking.hold_expires_at < now,
            )
            .all()
        )
        for b in rows:
            b.status = BookingStatus.hold_expired
            b.payment_status = BookingPaymentStatus.unpaid
            db.add(StatusHistory(
                booking_id=b.id, old_status="accepted", new_status="hold_expired",
                reason="hold_expiry_job",
            ))
            venue = db.get(Venue, b.venue_id)
            venue_name = venue.name if venue else "your venue"
            notifications.notify(db, b.user_id, "hold_expired",
                                 context={"venue_name": venue_name}, booking_id=b.id)
        logger.info("hold_expiry: expired %d booking(s)", len(rows))
