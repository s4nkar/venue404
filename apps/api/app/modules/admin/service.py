import logging
from supabase import create_client
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.modules.admin.schemas import VenueApprovalRequest
from app.modules.profile.models import Profile, UserRoleAssignment, UserRole, ProfileStatus

logger = logging.getLogger(__name__)


def approve_venue(venue_id: str, body: VenueApprovalRequest) -> None:
    raise NotImplementedError


def seed_super_admin() -> None:
    """
    Idempotent. Creates the super admin user in Supabase on first run. 
    Skipped entirely if SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD
    are not set in the environment.
    """
    email = settings.super_admin_email
    password = settings.super_admin_password

    if not email or not password:
        logger.info("SUPER_ADMIN_EMAIL/PASSWORD not set, skipping super admin seed")
        return

    db: Session = SessionLocal()
    try:
        _seed(db, email, password)
    finally:
        db.close()


def _seed(db: Session, email: str, password: str) -> None:
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

    # Step 1: resolve or create the Supabase auth user
    auth_user_id = _resolve_supabase_user(supabase, email, password)

    # Step 2: ensure profile row exists
    profile = db.query(Profile).filter(Profile.id == auth_user_id).first()
    if not profile:
        profile = Profile(
            id=auth_user_id,
            full_name="Super Admin",
            status=ProfileStatus.active,
        )
        db.add(profile)
        db.flush()
        logger.info("Created profile for super admin %s", email)

    # Step 3: ensure super_admin role row exists
    role_exists = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == auth_user_id,
        UserRoleAssignment.role == UserRole.super_admin,
    ).first()

    if not role_exists:
        db.add(UserRoleAssignment(user_id=auth_user_id, role=UserRole.super_admin))
        logger.info("Assigned super_admin role to %s", email)

    db.commit()
    logger.info("Super admin seed complete for %s", email)


def _resolve_supabase_user(supabase, email: str, password: str):
    """
    Returns the UUID of the Supabase auth user, creating them if they don't
    exist. Uses admin API so no confirmation email is triggered.
    """
    import uuid

    # Try listing users to find by email (admin API)
    # Supabase admin.list_users() returns paginated results
    page = 1
    per_page = 1000
    while True:
        response = supabase.auth.admin.list_users(page=page, per_page=per_page)
        users = response if isinstance(response, list) else getattr(response, 'users', [])
        for u in users:
            if u.email == email:
                logger.info("Super admin already exists in Supabase: %s", email)
                return uuid.UUID(str(u.id))
        if len(users) < per_page:
            break
        page += 1

    # Not found — create via admin API (skips email confirmation)
    result = supabase.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
    })
    created = result.user if hasattr(result, 'user') else result
    logger.info("Created Supabase auth user for super admin: %s", email)
    return uuid.UUID(str(created.id))
