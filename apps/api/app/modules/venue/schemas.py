from pydantic import BaseModel
from typing import Optional, List


class CreateVenueRequest(BaseModel):
    name: str
    description: str
    address: str
    capacity: int
    price_per_day: float


class VenueResponse(BaseModel):
    id: str
    name: str
    description: str
    address: str
    capacity: int
    price_per_day: float
    approval_status: str
    owner_id: str
