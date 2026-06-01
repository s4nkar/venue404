from fastapi import APIRouter, Depends
from app.modules.notification.schemas import NotificationResponse
from app.modules.auth.dependencies import get_current_user
from app.modules.notification import service

router = APIRouter()


@router.get("/", response_model=list[NotificationResponse])
def list_notifications(user=Depends(get_current_user)):
    return service.list_notifications(user["sub"])


@router.patch("/{notification_id}/read", status_code=204)
def mark_read(notification_id: str, user=Depends(get_current_user)):
    service.mark_read(notification_id, user["sub"])
