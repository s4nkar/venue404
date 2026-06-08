from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.search.schemas import SearchParams, SearchResult
from app.modules.search import service
from app.shared.pagination import Page

router = APIRouter()


@router.get("/", response_model=Page[SearchResult])
def search_venues(
    q: str = Query(default=""),
    city: str = Query(default=""),
    venue_type: str | None = Query(default=None),
    capacity: int = Query(default=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    params = SearchParams(q=q, city=city, venue_type=venue_type, capacity=capacity, page=page, page_size=page_size)
    return service.search(db, params)
