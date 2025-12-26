from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, Integer, JSON, LargeBinary
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from uuid import uuid4
from datetime import datetime, timezone
from .db import Base


class Gist(Base):
    __tablename__ = "gists"
    gist_id: Mapped[str] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    gist_metadata: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    expiration_date: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    read_count: Mapped[int] = mapped_column(Integer, default=0)
    max_reads: Mapped[int] = mapped_column(Integer, default=100)
    version_history: Mapped[list] = mapped_column(JSON, nullable=True)
