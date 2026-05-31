from pydantic import BaseModel
from datetime import date


class CreateBookingRequest(BaseModel):
    venue_id: str
    start_date: date
    end_date: date
    notes: str = ""


class BookingResponse(BaseModel):
    id: str
    venue_id: str
    user_id: str
    start_date: date
    end_date: date
    status: str
