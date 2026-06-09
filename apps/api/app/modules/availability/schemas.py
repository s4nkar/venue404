from datetime import date, datetime, time
from pydantic import BaseModel


class OperatingWindow(BaseModel):
    is_available: bool
    opens_at: time | None = None
    closes_at: time | None = None
    spans_next_day: bool = False


class BlockedRange(BaseModel):
    starts_at: datetime
    ends_at: datetime


class AvailabilityResponse(BaseModel):
    date: date
    operating_window: OperatingWindow
    blocked_slots: list[BlockedRange] = []


class ValidationResponse(BaseModel):
    valid: bool
    effective_starts_at: datetime
    effective_ends_at: datetime
