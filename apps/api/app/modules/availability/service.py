from app.modules.availability.schemas import SlotResponse, BlockDateRequest
from typing import List


def get_slots(venue_id: str) -> List[SlotResponse]:
    raise NotImplementedError


def block_date(venue_id: str, owner_id: str, body: BlockDateRequest) -> None:
    raise NotImplementedError
