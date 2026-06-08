from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class SearchParams(BaseModel):
    q: str = ""
    city: str = ""
    venue_type: Optional[str] = None
    capacity: int = 0
    page: int = 1
    page_size: int = 20


class SearchResult(BaseModel):
    id: UUID
    name: str
    city: str
    venue_type: str
    capacity: int
    pricing_mode: str
    starting_price_paise: Optional[int] = None
    cover_photo_url: Optional[str] = None
