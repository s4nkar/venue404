from sqlalchemy import String, Boolean, Text, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base
from app.shared.models import TimestampMixin


class InAppNotification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
