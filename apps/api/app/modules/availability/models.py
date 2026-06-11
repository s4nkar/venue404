import uuid
from datetime import date
from sqlalchemy import Date, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base
from app.shared.models import TimestampMixin


class Slot(Base, TimestampMixin):
    __tablename__ = "slots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)


class BlockedDate(Base, TimestampMixin):
    __tablename__ = "blocked_dates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="")
