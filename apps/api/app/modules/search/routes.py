from fastapi import APIRouter, Query
from app.modules.search.schemas import SearchParams, SearchResult
from app.modules.search import service

router = APIRouter()


@router.get("/", response_model=list[SearchResult])
def search_venues(
    q: str = Query(default=""),
    city: str = Query(default=""),
    capacity: int = Query(default=0),
    page: int = Query(default=1),
):
    return service.search(SearchParams(q=q, city=city, capacity=capacity, page=page))
