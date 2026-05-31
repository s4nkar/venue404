from fastapi import APIRouter, Depends
from app.modules.booking.schemas import BookingResponse, CreateBookingRequest
from app.modules.auth.dependencies import get_current_user
from app.modules.booking import service

router = APIRouter()


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(booking_id: str, user=Depends(get_current_user)):
    return service.get_booking(booking_id)


@router.post("/", response_model=BookingResponse, status_code=201)
def create_booking(body: CreateBookingRequest, user=Depends(get_current_user)):
    return service.create_booking(user["sub"], body)
