from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import require_owner, AuthContext
from app.modules.venue.schemas import (
    VenueResponse,
    CreateVenueRequest,
    UpdateVenueRequest,
    PricingPreviewResponse,
    DeleteResponse,
    VenueAvailabilityResponse,
    BulkUpdateAvailabilityRequest,
    VenueBlockedDateResponse,
    CreateBlockedDateRequest,
    CancellationPolicyResponse,
    UpdateCancellationPolicyRequest,
    AmenityResponse,
    UpdateVenueAmenitiesRequest,
    BookingType,
    PublicVenueBlockedDateResponse,
)
from app.modules.venue import service

router = APIRouter()



#  Owner routes 

@router.get("/my/venues", response_model=list[VenueResponse])
def list_my_venues(
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):

    return service.list_owner_venues(db, owner_id=auth.user_id)


@router.post("/", response_model=VenueResponse, status_code=201)
def create_venue(
    body: CreateVenueRequest,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
   
    return service.create_venue(db, owner_id=auth.user_id, body=body)


@router.patch("/{venue_id}", response_model=VenueResponse)
def update_venue(
    venue_id: UUID,
    body: UpdateVenueRequest,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    
    return service.update_venue(db, venue_id=venue_id, owner_id=auth.user_id, body=body)


@router.delete("/{venue_id}", response_model=DeleteResponse, status_code=200)
def delete_venue(
    venue_id: UUID,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):

    service.delete_venue(db, venue_id=venue_id, owner_id=auth.user_id)
    return DeleteResponse(id=venue_id)


@router.post("/{venue_id}/submit", response_model=VenueResponse)
def submit_venue(
    venue_id: UUID,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return service.submit_venue(db, venue_id=venue_id, owner_id=auth.user_id)


@router.put("/{venue_id}/availability", response_model=list[VenueAvailabilityResponse])
def bulk_update_availability(
    venue_id: UUID,
    body: BulkUpdateAvailabilityRequest,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return service.bulk_update_availability(db, venue_id, auth.user_id, body.availabilities)


@router.post("/{venue_id}/blocked-dates", response_model=VenueBlockedDateResponse, status_code=201)
def create_blocked_date(
    venue_id: UUID,
    body: CreateBlockedDateRequest,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return service.create_blocked_date(db, venue_id, auth.user_id, body)


@router.delete("/{venue_id}/blocked-dates/{blocked_id}", response_model=DeleteResponse, status_code=200)
def delete_blocked_date(
    venue_id: UUID,
    blocked_id: UUID,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    service.delete_blocked_date(db, venue_id, blocked_id, auth.user_id)
    return DeleteResponse(id=blocked_id, message="Blocked date removed successfully")


@router.put("/{venue_id}/cancellation-policy", response_model=CancellationPolicyResponse)
def put_venue_cancellation_policy(
    venue_id: UUID,
    body: UpdateCancellationPolicyRequest,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return service.put_venue_cancellation_policy(db, venue_id, auth.user_id, body)


@router.put("/{venue_id}/amenities", response_model=list[AmenityResponse])
def update_venue_amenities(
    venue_id: UUID,
    body: UpdateVenueAmenitiesRequest,
    auth: AuthContext = Depends(require_owner),
    db: Session = Depends(get_db),
):
    return service.update_venue_amenities(db, venue_id, auth.user_id, body)







# Public routes 

@router.get("/{venue_id}", response_model=VenueResponse)
def get_venue(
    venue_id: UUID,
    db: Session = Depends(get_db),
):

    return service.get_venue(db, venue_id)


@router.get("/{venue_id}/pricing", response_model=PricingPreviewResponse)
def get_pricing_preview(
    venue_id: UUID,
    starts_at: datetime = Query(..., description="ISO 8601 datetime with timezone offset"),
    ends_at: datetime = Query(..., description="ISO 8601 datetime with timezone offset"),
    booking_type: BookingType = Query(..., description="full_day or time_slot"),
    db: Session = Depends(get_db),
):
    
    return service.get_pricing_preview(db, venue_id, starts_at, ends_at, booking_type)


@router.get("/{venue_id}/availability", response_model=list[VenueAvailabilityResponse])
def get_venue_availability(
    venue_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_venue_availability(db, venue_id)


@router.get("/{venue_id}/blocked-dates", response_model=list[PublicVenueBlockedDateResponse])
def get_venue_blocked_dates(
    venue_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_venue_blocked_dates(db, venue_id)


@router.get("/{venue_id}/cancellation-policy", response_model=CancellationPolicyResponse)
def get_venue_cancellation_policy(
    venue_id: UUID,
    db: Session = Depends(get_db),
):
    return service.get_venue_cancellation_policy(db, venue_id)