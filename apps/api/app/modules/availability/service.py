from datetime import date, datetime, time, timezone, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
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
from app.modules.venue.models import VenueAvailability


def _to_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _localize(booking_date: date, value: time, tz: ZoneInfo) -> datetime:
    return datetime.combine(booking_date, value).replace(tzinfo=tz)


def _minute_of_day(value: datetime) -> int:
    return (value.hour * 60) + value.minute


def _local_day_bounds(venue, booking_date: date) -> tuple[datetime, datetime]:
    tz = ZoneInfo(venue.timezone)
    starts_at = datetime.combine(booking_date, datetime.min.time()).replace(tzinfo=tz)
    ends_at = starts_at + timedelta(days=1)

    return starts_at.astimezone(timezone.utc), ends_at.astimezone(timezone.utc)


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
    booking_date: date,
    db_override: VenueAvailability | None = None,
) -> OperatingWindow:
    if isinstance(booking_date, datetime):
        booking_date = booking_date.date()

    day = booking_date.weekday()

    availability = db_override
    if availability is None:
        availability = next(
            (
                a
                for a in getattr(venue, "availability", [])
                if a.day_of_week == day and a.deleted_at is None
            ),
            None,
        )

    if availability is not None:
        if not availability.is_available:
            return OperatingWindow(is_available=False)

        return OperatingWindow(
            is_available=True,
            opens_at=availability.opens_at,
            closes_at=availability.closes_at,
            spans_next_day=availability.spans_next_day,
        )

    return OperatingWindow(
        is_available=True,
        opens_at=venue.open_time,
        closes_at=venue.close_time,
        spans_next_day=venue.spans_next_day,
    )


def is_date_blocked(
    venue,
    starts_at: datetime,
    ends_at: datetime,
) -> bool:
    starts_at = _to_utc(starts_at)
    ends_at = _to_utc(ends_at)

    for blocked in getattr(venue, "blocked_dates", []):

        if blocked.deleted_at:
            continue

        overlap = starts_at < _to_utc(blocked.ends_at) and ends_at > _to_utc(
            blocked.starts_at,
        )

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
    venue,
    booking_date: date,
    db_override: VenueAvailability | None = None,
) -> tuple[datetime, datetime]:
    operating_window = resolve_operating_window(
        venue=venue,
        booking_date=booking_date,
        db_override=db_override,
    )

    if not operating_window.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Venue closed on selected date",
        )

    tz = ZoneInfo(venue.timezone)

    starts_at = _localize(
        booking_date,
        operating_window.opens_at,
        tz,
    )

    ends_at = _localize(
        booking_date,
        operating_window.closes_at,
        tz,
    )

    if operating_window.spans_next_day:
        ends_at += timedelta(days=1)

    return (
        starts_at.astimezone(timezone.utc),
        ends_at.astimezone(timezone.utc),
    )


def validate_booking_request(
    db: Session,
    venue,
    starts_at: datetime | None,
    ends_at: datetime | None,
    booking_type: str,
    booking_date: date | None = None,
    guest_count: int | None = None,
) -> ValidationResponse:
    venue_tz = ZoneInfo(venue.timezone)

    if booking_type not in venue.allowed_booking_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking type not allowed",
        )

    if booking_type == "full_day":
        if booking_date is None:
            if starts_at is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="booking_date is required for full day bookings",
                )

            booking_date = _to_utc(starts_at).astimezone(venue_tz).date()

        starts_at, ends_at = expand_full_day_slot(
            venue=venue,
            booking_date=booking_date,
        )
    elif starts_at is None or ends_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="starts_at and ends_at are required for time slot bookings",
        )
    else:
        starts_at = _to_utc(starts_at)
        ends_at = _to_utc(ends_at)

    if ends_at <= starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time",
        )

    if starts_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking must be in the future",
        )

    if guest_count is not None and guest_count > venue.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest count exceeds venue capacity",
        )

    duration_minutes = int((ends_at - starts_at).total_seconds() / 60)

    if duration_minutes < venue.min_booking_duration_minutes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking duration too short",
        )

    if duration_minutes > venue.max_booking_duration_minutes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking duration exceeds limit",
        )

    local_starts_at = starts_at.astimezone(venue_tz)
    local_ends_at = ends_at.astimezone(venue_tz)

    if (
        booking_type == "time_slot"
        and (
            _minute_of_day(local_starts_at) % venue.slot_interval_minutes != 0
            or _minute_of_day(local_ends_at) % venue.slot_interval_minutes != 0
            or duration_minutes % venue.slot_interval_minutes != 0
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking times must align with slot interval",
        )

    operating_window = resolve_operating_window(
        venue,
        local_starts_at.date(),
    )

    if not operating_window.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Venue unavailable",
        )

    window_starts_at = _localize(
        local_starts_at.date(),
        operating_window.opens_at,
        venue_tz,
    )
    window_ends_at = _localize(
        local_starts_at.date(),
        operating_window.closes_at,
        venue_tz,
    )

    if operating_window.spans_next_day:
        window_ends_at += timedelta(days=1)

    if local_starts_at < window_starts_at or local_ends_at > window_ends_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking must be within venue operating window",
        )

    effective_starts_at, effective_ends_at = compute_effective_range(
        starts_at,
        ends_at,
        venue.pre_buffer_minutes,
        venue.post_buffer_minutes,
    )

    if is_date_blocked(
        venue,
        effective_starts_at,
        effective_ends_at,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Venue blocked for selected period",
        )

    conflict_exists = is_slot_blocked(
        db=db,
        venue_id=venue.id,
        effective_starts_at=effective_starts_at,
        effective_ends_at=effective_ends_at,
    )

    if conflict_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Selected slot unavailable",
        )

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
        booking_date,
    )

    if operating_window.is_available:
        window_start, window_end = expand_full_day_slot(venue, booking_date)
    else:
        window_start, window_end = _local_day_bounds(venue, booking_date)
    blocked_slots = (
        db.query(BookingSlot)
        .filter(
            BookingSlot.venue_id == venue.id,
            BookingSlot.is_blocking.is_(True),
            BookingSlot.deleted_at.is_(None),
            BookingSlot.effective_starts_at < window_end,
            BookingSlot.effective_ends_at > window_start,
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
    booking_date: date | None = None,
    guest_count: int | None = None,
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
        booking_date=booking_date,
        guest_count=guest_count,
    )


def get_pricing_quote(
    db: Session,
    venue_id: UUID,
    starts_at: datetime,
    ends_at: datetime,
    booking_type: str,
):
    _get_active_venue_or_404(db, venue_id)
    return get_pricing_quote_for_slot(
        db=db,
        venue_id=venue_id,
        starts_at=_to_utc(starts_at),
        ends_at=_to_utc(ends_at),
        booking_type=booking_type,
    )
