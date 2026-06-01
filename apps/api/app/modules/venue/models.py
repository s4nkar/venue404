from sqlalchemy import String, Integer, Float, Enum, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.core.database import Base
from app.shared.models import TimestampMixin
import enum


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Venue(Base, TimestampMixin):
    __tablename__ = "venues"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    price_per_day: Mapped[float] = mapped_column(Float, nullable=False)
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.pending
    )
    photos: Mapped[list["VenuePhoto"]] = relationship(back_populates="venue")


class VenuePhoto(Base, TimestampMixin):
    __tablename__ = "venue_photos"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    venue_id: Mapped[str] = mapped_column(String, ForeignKey("venues.id"), nullable=False)
    url: Mapped[str] = mapped_column(String, nullable=False)
    venue: Mapped["Venue"] = relationship(back_populates="photos")
