from app.modules.booking.models import BookingStatus

VALID_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.requested: {BookingStatus.accepted, BookingStatus.cancelled},
    BookingStatus.accepted: {BookingStatus.confirmed, BookingStatus.cancelled},
    BookingStatus.confirmed: {BookingStatus.completed, BookingStatus.cancelled},
    BookingStatus.cancelled: set(),
    BookingStatus.completed: set(),
}


def can_transition(current: BookingStatus, next_status: BookingStatus) -> bool:
    return next_status in VALID_TRANSITIONS.get(current, set())
