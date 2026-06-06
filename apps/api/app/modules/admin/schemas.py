import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Literal


class VenueApprovalRequest(BaseModel):
    action: Literal["approve", "reject"]
    reason: str = ""


class UserSummary(BaseModel):
    id: uuid.UUID
    full_name: str | None
    email: str | None
    phone: str | None
    status: str
    roles: list[str]
    created_at: datetime
    is_super_admin: bool

    model_config = {"from_attributes": True}


class UserStats(BaseModel):
    total: int
    active: int
    suspended: int
    pending: int
    rejected: int


class UserListResponse(BaseModel):
    items: list[UserSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: UserStats


class SuspendUserRequest(BaseModel):
    reason: str


class ReactivateUserRequest(BaseModel):
    reason: str = ""


class AdminActionResponse(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    action_type: str
    target_type: str
    target_id: uuid.UUID
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminActionListResponse(BaseModel):
    items: list[AdminActionResponse]
    total: int


class OwnerApprovalRequest(BaseModel):
    reason: str = ""
