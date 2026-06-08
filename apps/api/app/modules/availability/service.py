from datetime import (
    date,
    datetime,
    time,
    timedelta,
)

from sqlalchemy.orm import Session

from app.modules.booking.models import BookingSlot

from app.modules.availability.schemas import (
    AvailabilityResponse,
    OperatingWindow,
    BlockedRange,
    ValidationResponse,
)

from app.modules.venue.service import (
    _get_active_venue_or_404,
    get_pricing_quote_for_slot,
)


def compute_effective_range(
    starts_at: datetime,
    ends_at: datetime,
    pre_buffer_minutes: int,
    post_buffer_minutes: int,
) -> tuple[datetime, datetime]:
    return (
        starts_at - timedelta(minutes=pre_buffer_minutes),
        ends_at + timedelta(minutes=post_buffer_minutes),
    )


def resolve_operating_window(
    venue,
    booking_date: datetime,
) -> OperatingWindow | None:
    day = booking_date.weekday()

    availability = next(
        (
            a
            for a in venue.availability
            if (a.day_of_week == day and a.is_available and a.deleted_at is None)
        ),
        None,
    )

    if not availability:
        return None

    return OperatingWindow(
        is_available=True,
        opens_at=availability.opens_at,
        closes_at=availability.closes_at,
        spans_next_day=availability.spans_next_day,
    )


def is_date_blocked(
    venue,
    starts_at: datetime,
    ends_at: datetime,
) -> bool:

    for blocked in venue.blocked_dates:

        if blocked.deleted_at:
            continue

        overlap = starts_at < blocked.ends_at and ends_at > blocked.starts_at

        if overlap:
            return True

    return False


def is_slot_blocked(
    db: Session,
    venue_id,
    effective_starts_at: datetime,
    effective_ends_at: datetime,
) -> bool:
    return (
        db.query(BookingSlot)
        .filter(
            BookingSlot.venue_id == venue_id,
            BookingSlot.is_blocking.is_(True),
            BookingSlot.deleted_at.is_(None),
            BookingSlot.effective_starts_at < effective_ends_at,
            BookingSlot.effective_ends_at > effective_starts_at,
        )
        .first()
        is not None
    )


def expand_full_day_slot(
    booking_date: date,
    operating_window: OperatingWindow,
) -> tuple[datetime, datetime]:

    if not operating_window.is_available:
        raise ValueError("Venue closed on selected date")

    starts_at = datetime.combine(
        booking_date,
        operating_window.opens_at,
    )

    ends_at = datetime.combine(
        booking_date,
        operating_window.closes_at,
    )

    if operating_window.spans_next_day:
        ends_at += timedelta(days=1)

    return (
        starts_at,
        ends_at,
    )


def validate_booking_request(
    db: Session,
    venue,
    starts_at: datetime,
    ends_at: datetime,
    booking_type: str,
) -> ValidationResponse:

    if ends_at <= starts_at:
        raise ValueError("End time must be after start time")

    if starts_at <= datetime.utcnow():
        raise ValueError("Booking must be in the future")

    if booking_type not in venue.allowed_booking_types:
        raise ValueError("Booking type not allowed")

    duration_minutes = int((ends_at - starts_at).total_seconds() / 60)

    if (
        booking_type == "time_slot"
        and duration_minutes % venue.slot_interval_minutes != 0
    ):
        raise ValueError("Duration must align with slot interval")

    if duration_minutes < venue.min_booking_duration_minutes:
        raise ValueError("Booking duration too short")

    if duration_minutes > venue.max_booking_duration_minutes:
        raise ValueError("Booking duration exceeds limit")

    operating_window = resolve_operating_window(
        venue,
        starts_at,
    )

    if not operating_window:
        raise ValueError("Venue unavailable")

    booking_start_time = starts_at.time()
    booking_end_time = ends_at.time()

    if operating_window.opens_at and booking_start_time < operating_window.opens_at:
        raise ValueError("Booking starts before venue opens")

    if (
        not operating_window.spans_next_day
        and operating_window.closes_at
        and booking_end_time > operating_window.closes_at
    ):
        raise ValueError("Booking ends after venue closes")

    if is_date_blocked(
        venue,
        starts_at,
        ends_at,
    ):
        raise ValueError("Venue blocked for selected period")

    effective_starts_at, effective_ends_at = compute_effective_range(
        starts_at,
        ends_at,
        venue.pre_buffer_minutes,
        venue.post_buffer_minutes,
    )

    conflict_exists = is_slot_blocked(
        db=db,
        venue_id=venue.id,
        effective_starts_at=effective_starts_at,
        effective_ends_at=effective_ends_at,
    )

    if conflict_exists:
        raise ValueError("Selected slot unavailable")

    return ValidationResponse(
        valid=True,
        effective_starts_at=effective_starts_at,
        effective_ends_at=effective_ends_at,
    )


def get_availability_for_date(
    db: Session,
    venue_id,
    booking_date: date,
) -> AvailabilityResponse:

    venue = _get_active_venue_or_404(
        db,
        venue_id,
    )

    operating_window = resolve_operating_window(
        venue,
        datetime.combine(
            booking_date,
            time.min,
        ),
    )

    if not operating_window:
        operating_window = OperatingWindow(
            is_available=False,
        )

    blocked_slots = (
        db.query(BookingSlot)
        .filter(
            BookingSlot.venue_id == venue.id,
            BookingSlot.is_blocking.is_(True),
            BookingSlot.deleted_at.is_(None),
        )
        .all()
    )

    return AvailabilityResponse(
        date=booking_date,
        operating_window=operating_window,
        blocked_slots=[
            BlockedRange(
                starts_at=slot.starts_at,
                ends_at=slot.ends_at,
            )
            for slot in blocked_slots
        ],
    )


def validate_slot(
    db: Session,
    venue_id,
    booking_type,
    starts_at,
    ends_at,
):
    venue = _get_active_venue_or_404(
        db,
        venue_id,
    )

    return validate_booking_request(
        db=db,
        venue=venue,
        starts_at=starts_at,
        ends_at=ends_at,
        booking_type=booking_type,
    )
