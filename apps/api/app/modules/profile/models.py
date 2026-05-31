from sqlalchemy import String, Enum
from sqlalchemy.orm import mapped_column, Mapped
from app.core.database import Base
from app.shared.models import TimestampMixin
import enum


class UserRole(str, enum.Enum):
    user = "user"
    owner = "owner"
    admin = "admin"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.user)
