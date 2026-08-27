import uuid
import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.organization import Organization
    from backend.app.models.user import User
    from backend.app.models.scenario import Scenario

class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    development_type: Mapped[str] = mapped_column(String(100), default="multi_unit_residential", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    
    start_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    target_completion_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)

    # Soft-delete / Archive support
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    archived_at: Mapped[Optional[datetime.datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="projects")
    created_by: Mapped[Optional["User"]] = relationship("User", back_populates="created_projects")
    scenarios: Mapped[List["Scenario"]] = relationship("Scenario", back_populates="project", cascade="all, delete-orphan", order_by="Scenario.created_at")
