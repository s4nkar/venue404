from fastapi import APIRouter, Depends
from app.modules.availability.schemas import SlotResponse, BlockDateRequest
from app.modules.auth.dependencies import get_current_user
from app.modules.availability import service

router = APIRouter()


@router.get("/{venue_id}/slots", response_model=list[SlotResponse])
def get_slots(venue_id: str):
    return service.get_slots(venue_id)


@router.post("/{venue_id}/block", status_code=204)
def block_date(venue_id: str, body: BlockDateRequest, user=Depends(get_current_user)):
    service.block_date(venue_id, user["sub"], body)
