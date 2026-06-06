from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError
from app.modules.auth.schemas import AuthMeResponse, ProfileResponse
from app.modules.profile.models import Profile, ProfileStatus, UserRoleAssignment, UserRole


def register_owner(user_id, db: Session) -> None:
    profile = db.query(Profile).filter(
        Profile.id == user_id,
        Profile.deleted_at.is_(None),
    ).first()
    if not profile:
        raise ForbiddenError("Account not found")

    has_owner_role = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == user_id,
        UserRoleAssignment.role == "venue_owner",
    ).first()

    if has_owner_role and profile.status == ProfileStatus.pending:
        return  # idempotent — already registered as owner

    if has_owner_role and profile.status not in (ProfileStatus.active, ProfileStatus.rejected):
        raise ForbiddenError("Cannot register as owner in current account state")

    if not has_owner_role:
        db.add(UserRoleAssignment(user_id=user_id, role=UserRole.venue_owner))

    profile.status = ProfileStatus.pending
    db.commit()


def reapply_owner(user_id, db: Session) -> None:
    profile = db.query(Profile).filter(
        Profile.id == user_id,
        Profile.deleted_at.is_(None),
    ).first()
    if not profile:
        raise ForbiddenError("Account not found")
    if profile.status != ProfileStatus.rejected:
        raise ForbiddenError("Only rejected accounts can re-apply")
    profile.status = ProfileStatus.pending
    db.commit()


def get_me(current_user) -> AuthMeResponse:
    return AuthMeResponse(
        id=current_user.user_id,
        email=current_user.email,
        profile=ProfileResponse(
            full_name=current_user.full_name,
            phone=current_user.phone,
            avatar_url=current_user.avatar_url,
            status=current_user.status,
        ),
        roles=current_user.roles,
    )
