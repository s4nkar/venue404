from fastapi import APIRouter, Depends
from app.modules.admin.schemas import VenueApprovalRequest
from app.modules.auth.dependencies import require_role
from app.modules.admin import service

router = APIRouter()


@router.patch("/venues/{venue_id}/approve", status_code=204)
def approve_venue(venue_id: str, body: VenueApprovalRequest, _=Depends(require_role("super_admin"))):
    service.approve_venue(venue_id, body)
