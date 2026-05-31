from sqlalchemy import String, Date, Boolean, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base
from app.shared.models import TimestampMixin


class Slot(Base, TimestampMixin):
    __tablename__ = "slots"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    venue_id: Mapped[str] = mapped_column(String, ForeignKey("venues.id"), nullable=False)
    date: Mapped[str] = mapped_column(Date, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)


class BlockedDate(Base, TimestampMixin):
    __tablename__ = "blocked_dates"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    venue_id: Mapped[str] = mapped_column(String, ForeignKey("venues.id"), nullable=False)
    date: Mapped[str] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="")
