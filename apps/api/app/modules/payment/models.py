from sqlalchemy import String, Float, Enum, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base
from app.shared.models import TimestampMixin
import enum


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    booking_id: Mapped[str] = mapped_column(String, ForeignKey("bookings.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending)
    stripe_payment_intent_id: Mapped[str] = mapped_column(String, nullable=False)


class Refund(Base, TimestampMixin):
    __tablename__ = "refunds"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    payment_id: Mapped[str] = mapped_column(String, ForeignKey("payments.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
