from app.modules.booking.state_machine import can_transition, VALID_TRANSITIONS
from app.modules.booking.models import BookingStatus

TERMINAL = [
    BookingStatus.completed,
    BookingStatus.canceled,
    BookingStatus.hold_expired,
    BookingStatus.request_expired,
]


def test_eight_states():
    assert len(list(BookingStatus)) == 8


def test_happy_path_request_accept_confirm_complete():
    assert can_transition(BookingStatus.requested, BookingStatus.accepted)
    assert can_transition(BookingStatus.accepted, BookingStatus.confirmed)
    assert can_transition(BookingStatus.confirmed, BookingStatus.completed)


def test_payment_required_before_confirm():
    # cannot jump straight from requested to confirmed
    assert not can_transition(BookingStatus.requested, BookingStatus.confirmed)


def test_hold_and_conflict_paths():
    assert can_transition(BookingStatus.accepted, BookingStatus.hold_expired)
    assert can_transition(BookingStatus.accepted, BookingStatus.conflict_canceled)
    assert can_transition(BookingStatus.requested, BookingStatus.conflict_canceled)


def test_conflict_canceled_can_be_reactivated():
    assert can_transition(BookingStatus.conflict_canceled, BookingStatus.requested)


def test_terminal_states_have_no_exits():
    for s in TERMINAL:
        assert VALID_TRANSITIONS[s] == set()
        assert not can_transition(s, BookingStatus.requested)
