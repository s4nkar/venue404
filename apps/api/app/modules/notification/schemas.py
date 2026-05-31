from pydantic import BaseModel
from datetime import datetime


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    message: str
    is_read: bool
    created_at: datetime
