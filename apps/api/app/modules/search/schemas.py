from pydantic import BaseModel
from typing import Optional


class SearchParams(BaseModel):
    q: str = ""
    city: str = ""
    capacity: int = 0
    page: int = 1


class SearchResult(BaseModel):
    id: str
    name: str
    address: str
    capacity: int
    price_per_day: float
