from app.modules.venue.schemas import VenueResponse, CreateVenueRequest


def get_venue(venue_id: str) -> VenueResponse:
    raise NotImplementedError


def create_venue(owner_id: str, body: CreateVenueRequest) -> VenueResponse:
    raise NotImplementedError
