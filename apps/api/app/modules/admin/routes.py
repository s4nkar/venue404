from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.admin.schemas import (
    VenueApprovalRequest,
    UserListResponse,
    UserSummary,
    SuspendUserRequest,
    ReactivateUserRequest,
    AdminActionListResponse,
    OwnerApprovalRequest,
)
from app.modules.auth.dependencies import require_admin, AuthContext
from app.modules.admin import service

router = APIRouter()


@router.patch("/venues/{venue_id}/approve", status_code=204)
def approve_venue(venue_id: str, body: VenueApprovalRequest, _=Depends(require_admin)):
    service.approve_venue(venue_id, body)


@router.get("/users", response_model=UserListResponse)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status: str | None = Query(None, pattern="^(active|suspended|pending|rejected)$"),
    role: str | None = Query(None, pattern="^(customer|venue_owner|super_admin)$"),
    _: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return service.list_users(
        db,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
        role=role,
    )


@router.get("/users/{user_id}", response_model=UserSummary)
def get_user(
    user_id: UUID,
    _: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return service.get_user(db, user_id)


@router.patch("/users/{user_id}/suspend", status_code=204)
def suspend_user(
    user_id: UUID,
    body: SuspendUserRequest,
    auth: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service.suspend_user(db, admin_id=auth.user_id, user_id=user_id, reason=body.reason)


@router.patch("/users/{user_id}/reactivate", status_code=204)
def reactivate_user(
    user_id: UUID,
    body: ReactivateUserRequest,
    auth: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service.reactivate_user(db, admin_id=auth.user_id, user_id=user_id, reason=body.reason)


@router.patch("/venue-owners/{user_id}/approve", status_code=204)
def approve_owner(
    user_id: UUID,
    body: OwnerApprovalRequest,
    auth: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service.approve_owner(db, admin_id=auth.user_id, user_id=user_id, reason=body.reason)


@router.patch("/venue-owners/{user_id}/reject", status_code=204)
def reject_owner(
    user_id: UUID,
    body: OwnerApprovalRequest,
    auth: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service.reject_owner(db, admin_id=auth.user_id, user_id=user_id, reason=body.reason)


@router.get("/actions", response_model=AdminActionListResponse)
def list_actions(
    limit: int = Query(20, ge=1, le=100),
    target_type: str | None = Query(None, pattern="^(user|venue|booking)$"),
    _: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return service.list_actions(db, limit=limit, target_type=target_type)
