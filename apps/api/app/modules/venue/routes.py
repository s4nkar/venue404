from fastapi import APIRouter, Depends
from app.modules.venue.schemas import VenueResponse, CreateVenueRequest
from app.modules.auth.dependencies import get_current_user
from app.modules.venue import service

router = APIRouter()


@router.get("/{venue_id}", response_model=VenueResponse)
def get_venue(venue_id: str):
    return service.get_venue(venue_id)


@router.post("/", response_model=VenueResponse, status_code=201)
def create_venue(body: CreateVenueRequest, user=Depends(get_current_user)):
    return service.create_venue(user["sub"], body)
