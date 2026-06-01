from app.modules.booking.schemas import BookingResponse, CreateBookingRequest


def get_booking(booking_id: str) -> BookingResponse:
    raise NotImplementedError


def create_booking(user_id: str, body: CreateBookingRequest) -> BookingResponse:
    raise NotImplementedError
