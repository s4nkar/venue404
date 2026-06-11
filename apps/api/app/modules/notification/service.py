import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import List

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import send_email
from app.core.exceptions import NotFoundError, ForbiddenError
from app.modules.notification.models import InAppNotification
from app.modules.notification.schemas import NotificationResponse
from app.modules.notification.templates import render_notification

logger = logging.getLogger(__name__)


def notify(db: Session, user_id, type: str, context: dict | None = None, booking_id=None) -> InAppNotification:
    """Create an in-app notification and best-effort send the email.

    Always writes the in-app row. Email is best-effort: failures are logged and
    leave sent_at NULL, never aborting the surrounding DB transaction. The caller
    is responsible for commit (request path commits; webhook/job context commits).
    """
    title, body, html = render_notification(type, context, booking_id)
    row = InAppNotification(user_id=user_id, booking_id=booking_id, type=type, title=title, body=body)
    db.add(row)
    db.flush()

    try:
        email = _get_user_email(user_id)
        if email and send_email(email, title, html):
            row.sent_at = datetime.now(timezone.utc)
    except Exception:
        logger.exception("Notification email failed for user %s (type=%s)", user_id, type)

    return row


def list_notifications(db: Session, user_id) -> List[NotificationResponse]:
    rows = (
        db.query(InAppNotification)
        .filter(InAppNotification.user_id == user_id)
        .order_by(InAppNotification.created_at.desc())
        .all()
    )
    return [_to_response(r) for r in rows]


def mark_read(db: Session, notification_id: str, user_id) -> None:
    row = db.query(InAppNotification).filter(InAppNotification.id == notification_id).first()
    if not row:
        raise NotFoundError("Notification not found")
    if str(row.user_id) != str(user_id):
        raise ForbiddenError("Not your notification")
    if row.read_at is None:
        row.read_at = datetime.now(timezone.utc)
        db.commit()


def _to_response(r: InAppNotification) -> NotificationResponse:
    return NotificationResponse(
        id=str(r.id),
        user_id=str(r.user_id),
        booking_id=str(r.booking_id) if r.booking_id else None,
        type=r.type,
        title=r.title,
        body=r.body,
        read_at=r.read_at,
        created_at=r.created_at,
    )


def _get_user_email(user_id) -> str | None:
    """Resolve a user's email via the Supabase Auth Admin API.

    Email lives in auth.users (Supabase-managed), not in profiles, so jobs and
    webhooks (which have no JWT) look it up here. Returns None on any failure.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return None
    url = f"{settings.supabase_url}/auth/v1/admin/users/{user_id}"
    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:  # noqa: S310
            data = json.loads(resp.read())
        return data.get("email")
    except (urllib.error.URLError, json.JSONDecodeError, KeyError):
        logger.warning("Could not resolve email for user %s", user_id)
        return None
