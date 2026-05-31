from pydantic import BaseModel
from typing import Literal


class VenueApprovalRequest(BaseModel):
    action: Literal["approve", "reject"]
    reason: str = ""
