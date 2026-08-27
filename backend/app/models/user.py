import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.organization import Organization
    from backend.app.models.project import Project

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="developer", nullable=False)  # admin, developer, viewer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    organization_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="users")
    created_projects: Mapped[List["Project"]] = relationship("Project", back_populates="created_by")
