from app.modules.booking.models import BookingStatus


VALID_TRANSITIONS: dict[BookingStatus, set[BookingStatus]] = {
    BookingStatus.requested: {
        BookingStatus.owner_accepted,
        BookingStatus.owner_rejected,
        BookingStatus.request_expired,
        BookingStatus.conflict_cancelled,
        BookingStatus.admin_cancelled,
    },
    BookingStatus.owner_accepted: {
        BookingStatus.confirmed,
        BookingStatus.hold_expired,
        BookingStatus.user_cancelled,
        BookingStatus.admin_cancelled,
        # A competing accepted booking is conflict-cancelled when another
        # requester pays the advance first (acceptance no longer reserves the slot).
        BookingStatus.conflict_cancelled,
    },
    BookingStatus.confirmed: {
        BookingStatus.completed,
        BookingStatus.user_cancelled,
        BookingStatus.admin_cancelled,
        BookingStatus.balance_overdue_cancelled,
    },
    BookingStatus.completed: set(),
    BookingStatus.hold_expired: set(),
    BookingStatus.request_expired: set(),
    BookingStatus.conflict_cancelled: set(),
    BookingStatus.user_cancelled: set(),
    BookingStatus.admin_cancelled: set(),
    BookingStatus.owner_rejected: set(),
    BookingStatus.balance_overdue_cancelled: set(),
}


def can_transition(current: BookingStatus, next_status: BookingStatus) -> bool:
    return next_status in VALID_TRANSITIONS.get(current, set())
