import json
import logging
import math
import urllib.request
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, text, cast
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.exceptions import NotFoundError, ForbiddenError, ConflictError
from app.modules.admin.models import AdminAction
from app.modules.admin.schemas import AmenityUpdateRequest
from app.modules.profile.models import Profile, UserRoleAssignment, UserRole, ProfileStatus
from app.modules.venue.models import Amenity, VenueAmenity, Venue, VenueStatus



logger = logging.getLogger(__name__)

def list_admin_venues(
    db: Session,
    *,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    base = db.query(Venue).filter(Venue.deleted_at.is_(None))

    stats_row = base.with_entities(
        func.count(Venue.id).label("total"),
        func.count(case((Venue.status == VenueStatus.pending_approval, 1))).label("pending_approval"),
        func.count(case((Venue.status == VenueStatus.approved, 1))).label("approved"),
        func.count(case((Venue.status == VenueStatus.rejected, 1))).label("rejected"),
        func.count(case((Venue.status == VenueStatus.suspended, 1))).label("suspended"),
        func.count(case((Venue.status == VenueStatus.draft, 1))).label("draft"),
    ).one()

    filtered = base
    if status:
        filtered = filtered.filter(Venue.status == VenueStatus(status))
    if search:
        safe = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        filtered = filtered.filter(Venue.name.ilike(f"%{safe}%"))

    total = filtered.with_entities(func.count(Venue.id)).scalar()
    venues = (
        filtered
        .options(joinedload(Venue.photos), joinedload(Venue.amenities))
        .order_by(Venue.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    owner_ids = [v.owner_id for v in venues]
    profiles = db.query(Profile).filter(Profile.id.in_(owner_ids)).all()
    profile_by_id = {p.id: p for p in profiles}

    items = []
    for v in venues:
        cover = next((p.image_url for p in v.photos if p.is_cover and p.deleted_at is None), None)
        owner = profile_by_id.get(v.owner_id)
        items.append({
            "id": v.id,
            "name": v.name,
            "slug": v.slug,
            "description": v.description,
            "venue_type": v.venue_type,
            "address_line1": v.address_line1,
            "city": v.city,
            "state": v.state,
            "country": v.country,
            "min_capacity": v.min_capacity,
            "max_capacity": v.max_capacity,
            "open_time": str(v.open_time),
            "close_time": str(v.close_time),
            "pricing_mode": v.pricing_mode,
            "starting_price_paise": v.starting_price_paise,
            "hourly_rate_paise": v.hourly_rate_paise,
            "advance_pct": float(v.advance_pct),
            "platform_commission_pct": float(v.platform_commission_pct),
            "status": v.status.value,
            "is_active": v.is_active,
            "cover_photo_url": cover,
            "amenities": [a.name for a in v.amenities],
            "owner": {
                "id": owner.id if owner else v.owner_id,
                "full_name": owner.full_name if owner else None,
                "email": owner.email if owner else None,
            },
            "created_at": v.created_at,
            "updated_at": v.updated_at,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total else 1,
        "stats": {
            "total": stats_row.total,
            "pending_approval": stats_row.pending_approval,
            "approved": stats_row.approved,
            "rejected": stats_row.rejected,
            "suspended": stats_row.suspended,
            "draft": stats_row.draft,
        },
    }


def _get_venue_or_404(db: Session, venue_id: uuid.UUID) -> Venue:
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.deleted_at.is_(None)).first()
    if not venue:
        raise NotFoundError("Venue not found")
    return venue


def _check_no_active_bookings(db: Session, venue_id: uuid.UUID) -> None:
    # to_regclass returns NULL (not an error) when the table doesn't exist, so this query
    # never fails and never poisons the current transaction.
    table_exists = db.execute(text("SELECT to_regclass('public.bookings') IS NOT NULL")).scalar()
    if not table_exists:
        return  # Bookings not yet migrated — skip check
    try:
        from app.modules.booking.models import Booking, BookingStatus  # noqa: PLC0415
        count = (
            db.query(func.count(Booking.id))
            .filter(
                cast(Booking.venue_id, PGUUID) == venue_id,
                Booking.status.in_([
                    BookingStatus.requested, BookingStatus.accepted, BookingStatus.confirmed,
                ]),
            )
            .scalar()
        )
        if count and count > 0:
            raise ConflictError(f"Cannot suspend: venue has {count} active booking(s)")
    except ConflictError:
        raise
    except Exception as e:
        logger.warning("Booking check error for venue %s: %s", venue_id, e)


def approve_venue(
    db: Session,
    *,
    admin_id: uuid.UUID,
    venue_id: uuid.UUID,
    reason: str = "",
) -> None:
    venue = _get_venue_or_404(db, venue_id)
    if venue.status != VenueStatus.pending_approval:
        raise ConflictError("Venue is not pending approval")
    venue.status = VenueStatus.approved
    db.add(AdminAction(
        admin_id=admin_id, action_type="venue_approved",
        target_type="venue", target_id=venue_id, reason=reason or None,
    ))
    db.commit()


def reject_venue(
    db: Session,
    *,
    admin_id: uuid.UUID,
    venue_id: uuid.UUID,
    reason: str = "",
) -> None:
    venue = _get_venue_or_404(db, venue_id)
    if venue.status not in (VenueStatus.pending_approval, VenueStatus.approved):
        raise ConflictError("Venue cannot be rejected in its current state")
    venue.status = VenueStatus.rejected
    db.add(AdminAction(
        admin_id=admin_id, action_type="venue_rejected",
        target_type="venue", target_id=venue_id, reason=reason or None,
    ))
    db.commit()


def suspend_venue(
    db: Session,
    *,
    admin_id: uuid.UUID,
    venue_id: uuid.UUID,
    reason: str,
) -> None:
    if not reason.strip():
        raise ConflictError("Reason is required to suspend a venue")
    venue = _get_venue_or_404(db, venue_id)
    if venue.status == VenueStatus.suspended:
        raise ConflictError("Venue is already suspended")
    if venue.status != VenueStatus.approved:
        raise ConflictError("Only approved venues can be suspended")
    _check_no_active_bookings(db, venue_id)
    venue.status = VenueStatus.suspended
    db.add(AdminAction(
        admin_id=admin_id, action_type="venue_suspended",
        target_type="venue", target_id=venue_id, reason=reason,
    ))
    db.commit()


def reactivate_venue(
    db: Session,
    *,
    admin_id: uuid.UUID,
    venue_id: uuid.UUID,
    reason: str = "",
) -> None:
    venue = _get_venue_or_404(db, venue_id)
    if venue.status not in (VenueStatus.suspended, VenueStatus.rejected):
        raise ConflictError("Only suspended or rejected venues can be reactivated")
    venue.status = VenueStatus.approved
    db.add(AdminAction(
        admin_id=admin_id, action_type="venue_reactivated",
        target_type="venue", target_id=venue_id, reason=reason or None,
    ))
    db.commit()


def approve_owner(
    db: Session,
    *,
    admin_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: str = "",
) -> None:
    profile = db.query(Profile).filter(
        Profile.id == user_id,
        Profile.deleted_at.is_(None),
    ).first()
    if not profile:
        raise NotFoundError("User not found")
    if profile.status != ProfileStatus.pending:
        raise ConflictError("User is not in pending status")

    profile.status = ProfileStatus.active
    db.add(AdminAction(
        admin_id=admin_id,
        action_type="venue_owner_approved",
        target_type="user",
        target_id=user_id,
        reason=reason or None,
    ))
    db.commit()


def reject_owner(
    db: Session,
    *,
    admin_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: str = "",
) -> None:
    profile = db.query(Profile).filter(
        Profile.id == user_id,
        Profile.deleted_at.is_(None),
    ).first()
    if not profile:
        raise NotFoundError("User not found")
    if profile.status != ProfileStatus.pending:
        raise ConflictError("User is not in pending status")

    profile.status = ProfileStatus.rejected
    db.add(AdminAction(
        admin_id=admin_id,
        action_type="venue_owner_rejected",
        target_type="user",
        target_id=user_id,
        reason=reason or None,
    ))
    db.commit()


def _build_user_dict(
    profile: Profile,
    roles: list[str],
    email: str | None,
) -> dict:
    return {
        "id": profile.id,
        "full_name": profile.full_name,
        "email": email,
        "phone": profile.phone,
        "status": profile.status.value,
        "roles": roles,
        "created_at": profile.created_at,
        "is_super_admin": "super_admin" in roles,
    }


def get_owner_stats(db: Session) -> dict:
    owner_subq = (
        db.query(UserRoleAssignment.user_id)
        .filter(UserRoleAssignment.role == UserRole.venue_owner)
        .subquery()
    )
    base = db.query(Profile).filter(
        Profile.deleted_at.is_(None),
        Profile.id.in_(owner_subq),
    )
    row = base.with_entities(
        func.count(Profile.id).label("total"),
        func.count(case((Profile.status == ProfileStatus.pending, 1))).label("pending"),
        func.count(case((Profile.status == ProfileStatus.active, 1))).label("active"),
        func.count(case((Profile.status == ProfileStatus.rejected, 1))).label("rejected"),
        func.count(case((Profile.status == ProfileStatus.suspended, 1))).label("suspended"),
    ).one()
    return {
        "total": row.total,
        "pending": row.pending,
        "active": row.active,
        "rejected": row.rejected,
        "suspended": row.suspended,
    }


def list_users(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status: str | None = None,
    role: str | None = None,
) -> dict:
    base = db.query(Profile).filter(Profile.deleted_at.is_(None))

    filtered = base
    if search:
        safe = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{safe}%"
        filtered = filtered.filter(
            Profile.full_name.ilike(pattern) | Profile.email.ilike(pattern)
        )
    if status:
        filtered = filtered.filter(Profile.status == ProfileStatus(status))
    if role:
        role_subq = (
            db.query(UserRoleAssignment.user_id)
            .filter(UserRoleAssignment.role == UserRole(role))
            .subquery()
        )
        filtered = filtered.filter(Profile.id.in_(role_subq))

    total = filtered.with_entities(func.count(Profile.id)).scalar()

    # Global stats — always reflect platform-wide counts regardless of filters
    stats_row = base.with_entities(
        func.count(Profile.id).label("total"),
        func.count(case((Profile.status == ProfileStatus.active, 1))).label("active"),
        func.count(case((Profile.status == ProfileStatus.suspended, 1))).label("suspended"),
        func.count(case((Profile.status == ProfileStatus.pending, 1))).label("pending"),
        func.count(case((Profile.status == ProfileStatus.rejected, 1))).label("rejected"),
    ).one()

    profiles = (
        filtered.order_by(Profile.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    profile_ids = [p.id for p in profiles]

    role_rows = (
        db.query(UserRoleAssignment)
        .filter(UserRoleAssignment.user_id.in_(profile_ids))
        .all()
    )
    roles_by_user: dict[uuid.UUID, list[str]] = {pid: [] for pid in profile_ids}
    for rr in role_rows:
        if rr.user_id in roles_by_user:
            roles_by_user[rr.user_id].append(rr.role.value)

    items = [
        _build_user_dict(p, roles_by_user.get(p.id, []), p.email)
        for p in profiles
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total else 1,
        "stats": {
            "total": stats_row.total,
            "active": stats_row.active,
            "suspended": stats_row.suspended,
            "pending": stats_row.pending,
            "rejected": stats_row.rejected,
        },
    }


def get_user(db: Session, user_id: uuid.UUID) -> dict:
    profile = db.query(Profile).filter(
        Profile.id == user_id,
        Profile.deleted_at.is_(None),
    ).first()
    if not profile:
        raise NotFoundError("User not found")

    role_rows = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == user_id,
    ).all()
    roles = [r.role.value for r in role_rows]
    return _build_user_dict(profile, roles, profile.email)


def suspend_user(
    db: Session,
    *,
    admin_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: str,
) -> None:
    if not reason.strip():
        raise ConflictError("Reason is required")

    profile = db.query(Profile).filter(
        Profile.id == user_id,
        Profile.deleted_at.is_(None),
    ).first()
    if not profile:
        raise NotFoundError("User not found")

    is_super_admin = db.query(UserRoleAssignment).filter(
        UserRoleAssignment.user_id == user_id,
        UserRoleAssignment.role == UserRole.super_admin,
    ).first()
    if is_super_admin:
        raise ForbiddenError("Super admin accounts cannot be suspended")

    if profile.status == ProfileStatus.suspended:
        raise ConflictError("User is already suspended")

    profile.status = ProfileStatus.suspended
    db.add(AdminAction(
        admin_id=admin_id,
        action_type="user_suspended",
        target_type="user",
        target_id=user_id,
        reason=reason,
    ))
    db.commit()


def reactivate_user(
    db: Session,
    *,
    admin_id: uuid.UUID,
    user_id: uuid.UUID,
    reason: str = "",
) -> None:
    profile = db.query(Profile).filter(
        Profile.id == user_id,
        Profile.deleted_at.is_(None),
    ).first()
    if not profile:
        raise NotFoundError("User not found")

    if profile.status == ProfileStatus.active:
        raise ConflictError("User is already active")

    profile.status = ProfileStatus.active
    db.add(AdminAction(
        admin_id=admin_id,
        action_type="user_reactivated",
        target_type="user",
        target_id=user_id,
        reason=reason,
    ))
    db.commit()


def _get_amenity_or_404(db: Session, amenity_id: uuid.UUID) -> Amenity:
    amenity = db.query(Amenity).filter(Amenity.id == amenity_id).first()
    if not amenity:
        raise NotFoundError("Amenity not found")
    return amenity


def _count_active_venues(db: Session, amenity_id: uuid.UUID) -> int:
    return db.query(VenueAmenity).filter(VenueAmenity.amenity_id == amenity_id).count()


def _amenity_to_dict(amenity: Amenity, active_venue_count: int) -> dict:
    return {
        "id": amenity.id,
        "name": amenity.name,
        "icon": amenity.icon,
        "created_at": amenity.created_at,
        "deleted_at": amenity.deleted_at,
        "active_venue_count": active_venue_count,
    }


def list_amenities(db: Session, *, include_deleted: bool = False) -> dict:
    query = db.query(Amenity)
    if not include_deleted:
        query = query.filter(Amenity.deleted_at.is_(None))

    amenities = query.order_by(Amenity.name.asc()).all()
    amenity_ids = [a.id for a in amenities]

    count_rows = (
        db.query(VenueAmenity.amenity_id, func.count(VenueAmenity.venue_id).label("cnt"))
        .filter(VenueAmenity.amenity_id.in_(amenity_ids))
        .group_by(VenueAmenity.amenity_id)
        .all()
    ) if amenity_ids else []
    counts = {row.amenity_id: row.cnt for row in count_rows}

    items = [_amenity_to_dict(a, counts.get(a.id, 0)) for a in amenities]
    return {"items": items, "total": len(items)}


def create_amenity(
    db: Session,
    *,
    admin_id: uuid.UUID,
    name: str,
    icon: str | None,
) -> dict:
    normalized = name.strip()
    # Serialize concurrent creates for the same name — prevents two transactions
    # from both reading "not found" and both inserting, which DB constraints alone can't stop.
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:n))"), {"n": normalized.lower()})
    amenity = Amenity(name=normalized, icon=icon)
    db.add(amenity)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ConflictError("An amenity with this name already exists")

    db.add(AdminAction(
        admin_id=admin_id,
        action_type="amenity_created",
        target_type="amenity",
        target_id=amenity.id,
    ))
    db.commit()
    db.refresh(amenity)
    return _amenity_to_dict(amenity, 0)


def update_amenity(
    db: Session,
    *,
    admin_id: uuid.UUID,
    amenity_id: uuid.UUID,
    body: AmenityUpdateRequest,
) -> dict:
    amenity = _get_amenity_or_404(db, amenity_id)
    if amenity.deleted_at is not None:
        raise ConflictError("Cannot update a deleted amenity")

    if "name" in body.model_fields_set and body.name is not None:
        normalized = body.name.strip()
        db.execute(text("SELECT pg_advisory_xact_lock(hashtext(:n))"), {"n": normalized.lower()})
        amenity.name = normalized
    if "icon" in body.model_fields_set:
        amenity.icon = body.icon

    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise ConflictError("An amenity with this name already exists")

    db.add(AdminAction(
        admin_id=admin_id,
        action_type="amenity_updated",
        target_type="amenity",
        target_id=amenity.id,
    ))
    db.commit()
    db.refresh(amenity)
    active_count = _count_active_venues(db, amenity.id)
    return _amenity_to_dict(amenity, active_count)


def delete_amenity(
    db: Session,
    *,
    admin_id: uuid.UUID,
    amenity_id: uuid.UUID,
) -> dict:
    amenity = _get_amenity_or_404(db, amenity_id)
    if amenity.deleted_at is not None:
        raise ConflictError("Amenity is already deleted")

    active_count = _count_active_venues(db, amenity.id)
    amenity.deleted_at = datetime.now(timezone.utc)

    db.add(AdminAction(
        admin_id=admin_id,
        action_type="amenity_deleted",
        target_type="amenity",
        target_id=amenity.id,
    ))
    db.commit()
    return {"deleted": True, "active_venue_count": active_count}


def list_actions(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    target_type: str | None = None,
    action_type: str | None = None,
    # Legacy — used by dashboard summary (returns at most `limit` items, page 1)
    limit: int | None = None,
) -> dict:
    query = db.query(AdminAction)
    if target_type:
        query = query.filter(AdminAction.target_type == target_type)
    if action_type:
        query = query.filter(AdminAction.action_type == action_type)

    total = query.with_entities(func.count(AdminAction.id)).scalar()

    effective_page_size = limit if limit is not None else page_size
    offset = 0 if limit is not None else (page - 1) * page_size

    items = (
        query
        .order_by(AdminAction.created_at.desc())
        .offset(offset)
        .limit(effective_page_size)
        .all()
    )

    # Batch-enrich admin names
    admin_ids = list({a.admin_id for a in items})
    admin_profiles = db.query(Profile).filter(Profile.id.in_(admin_ids)).all()
    admin_name_by_id = {p.id: p.full_name for p in admin_profiles}

    # Batch-resolve target names grouped by target_type
    target_name_by_id: dict[uuid.UUID, str] = {}

    user_ids = [a.target_id for a in items if a.target_type == "user"]
    if user_ids:
        rows = db.query(Profile.id, Profile.full_name).filter(Profile.id.in_(user_ids)).all()
        target_name_by_id.update({r.id: r.full_name for r in rows if r.full_name})

    venue_ids = [a.target_id for a in items if a.target_type == "venue"]
    if venue_ids:
        rows = db.query(Venue.id, Venue.name).filter(Venue.id.in_(venue_ids)).all()
        target_name_by_id.update({r.id: r.name for r in rows})

    amenity_ids = [a.target_id for a in items if a.target_type == "amenity"]
    if amenity_ids:
        rows = db.query(Amenity.id, Amenity.name).filter(Amenity.id.in_(amenity_ids)).all()
        target_name_by_id.update({r.id: r.name for r in rows})

    enriched = [
        {
            "id": a.id,
            "admin_id": a.admin_id,
            "admin_name": admin_name_by_id.get(a.admin_id),
            "action_type": a.action_type,
            "target_type": a.target_type,
            "target_id": a.target_id,
            "target_name": target_name_by_id.get(a.target_id),
            "reason": a.reason,
            "created_at": a.created_at,
        }
        for a in items
    ]

    return {
        "items": enriched,
        "total": total,
        "page": 1 if limit is not None else page,
        "page_size": effective_page_size,
        "total_pages": math.ceil(total / effective_page_size) if total else 1,
    }


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
