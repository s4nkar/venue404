from datetime import datetime
from sqlalchemy import DateTime, func
from sqlalchemy.orm import mapped_column, MappedColumn
from app.core.database import Base


class TimestampMixin:
    created_at: MappedColumn[datetime] = mapped_column(DateTime, default=func.now(), nullable=False)
    updated_at: MappedColumn[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now(), nullable=False
    )
