from app.modules.notification.schemas import NotificationResponse
from typing import List


def list_notifications(user_id: str) -> List[NotificationResponse]:
    raise NotImplementedError


def mark_read(notification_id: str, user_id: str) -> None:
    raise NotImplementedError
