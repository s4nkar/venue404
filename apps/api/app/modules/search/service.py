from app.modules.search.schemas import SearchParams, SearchResult
from typing import List


def search(params: SearchParams) -> List[SearchResult]:
    raise NotImplementedError
