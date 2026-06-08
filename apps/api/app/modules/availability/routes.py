from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.availability.schemas import (
    AvailabilityResponse,
)
from app.modules.venue.schemas import (
    PricingQuote,
)
from app.modules.availability import service
from app.modules.booking.models import BookingType

router = APIRouter()


@router.get(
    "/venues/{venue_id}/date/{booking_date}",
    response_model=AvailabilityResponse,
)
def availability_for_date(
    venue_id: str,
    booking_date: date,
    db: Session = Depends(get_db),
):
    return service.get_availability_for_date(
        db=db,
        venue_id=venue_id,
        booking_date=booking_date,
    )


@router.get(
    "/venues/{venue_id}/quote",
    response_model=PricingQuote,
)
def pricing_quote(
    venue_id: str,
    starts_at: datetime = Query(...),
    ends_at: datetime = Query(...),
    db: Session = Depends(get_db),
):
    return service.get_pricing_quote(
        db=db,
        venue_id=venue_id,
        starts_at=starts_at,
        ends_at=ends_at,
    )


@router.post(
    "/venues/{venue_id}/validate",
)
def validate_slot(
    venue_id: str,
    booking_type: str,
    starts_at: datetime = Query(...),
    ends_at: datetime = Query(...),
    db: Session = Depends(get_db),
):
    return service.validate_slot(
        db=db,
        venue_id=venue_id,
        booking_type=booking_type,
        starts_at=starts_at,
        ends_at=ends_at,
    )
