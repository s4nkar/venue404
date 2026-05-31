from sqlalchemy import String, Date, Enum, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.core.database import Base
from app.shared.models import TimestampMixin
import enum


class BookingStatus(str, enum.Enum):
    requested = "requested"
    accepted = "accepted"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    venue_id: Mapped[str] = mapped_column(String, ForeignKey("venues.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    start_date: Mapped[str] = mapped_column(Date, nullable=False)
    end_date: Mapped[str] = mapped_column(Date, nullable=False)
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.requested)
    notes: Mapped[str] = mapped_column(Text, default="")
    history: Mapped[list["StatusHistory"]] = relationship(back_populates="booking")


class StatusHistory(Base, TimestampMixin):
    __tablename__ = "booking_status_history"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    booking_id: Mapped[str] = mapped_column(String, ForeignKey("bookings.id"), nullable=False)
    from_status: Mapped[str] = mapped_column(String, nullable=False)
    to_status: Mapped[str] = mapped_column(String, nullable=False)
    booking: Mapped["Booking"] = relationship(back_populates="history")
