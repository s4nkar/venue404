import json
import logging
import urllib.request
import urllib.error
import uuid
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
    auth_user_id = _resolve_supabase_user(email, password)

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

    role_exists = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == auth_user_id,
        UserRoleAssignment.role == UserRole.super_admin,
    ).first()

    if not role_exists:
        db.add(UserRoleAssignment(user_id=auth_user_id, role=UserRole.super_admin))
        logger.info("Assigned super_admin role to %s", email)

    db.commit()
    logger.info("Super admin seed complete for %s", email)


def _supabase_admin_request(method: str, path: str, body: dict | None = None) -> dict:
    """Makes a request to the Supabase Auth Admin REST API."""
    url = f"{settings.supabase_url}/auth/v1/admin/{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310
        return json.loads(resp.read())


def _resolve_supabase_user(email: str, password: str) -> uuid.UUID:
    """
    Returns the UUID of the Supabase auth user, creating them if they
    don't exist. Uses the Admin API so no confirmation email is triggered.
    """
    # List users and search by email
    page = 1
    per_page = 1000
    while True:
        data = _supabase_admin_request("GET", f"users?page={page}&per_page={per_page}")
        users = data.get("users", [])
        for u in users:
            if u.get("email") == email:
                logger.info("Super admin already exists in Supabase: %s", email)
                return uuid.UUID(u["id"])
        if len(users) < per_page:
            break
        page += 1

    # Not found — create via Admin API (email_confirm skips verification email)
    result = _supabase_admin_request("POST", "users", {
        "email": email,
        "password": password,
        "email_confirm": True,
    })
    logger.info("Created Supabase auth user for super admin: %s", email)
    return uuid.UUID(result["id"])
