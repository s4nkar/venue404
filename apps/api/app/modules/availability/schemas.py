from pydantic import BaseModel
from datetime import date


class SlotResponse(BaseModel):
    date: date
    is_available: bool


class BlockDateRequest(BaseModel):
    date: date
    reason: str = ""
