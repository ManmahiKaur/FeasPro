import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.project import Project
    from backend.app.models.land import LandInput
    from backend.app.models.cost import CostItem
    from backend.app.models.sales import SalesProductItem
    from backend.app.models.funding import FundingAssumption
    from backend.app.models.schedule import ScheduleMilestone

class Scenario(Base, TimestampMixin):
    __tablename__ = "scenarios"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="scenarios")
    land_input: Mapped[Optional["LandInput"]] = relationship(
        "LandInput",
        back_populates="scenario",
        uselist=False,
        cascade="all, delete-orphan"
    )
    cost_items: Mapped[list["CostItem"]] = relationship(
        "CostItem",
        back_populates="scenario",
        cascade="all, delete-orphan",
        order_by="CostItem.created_at"
    )
    sales_products: Mapped[list["SalesProductItem"]] = relationship(
        "SalesProductItem",
        back_populates="scenario",
        cascade="all, delete-orphan",
        order_by="SalesProductItem.created_at"
    )
    funding_assumption: Mapped[Optional["FundingAssumption"]] = relationship(
        "FundingAssumption",
        back_populates="scenario",
        uselist=False,
        cascade="all, delete-orphan"
    )
    schedule_milestones: Mapped[list["ScheduleMilestone"]] = relationship(
        "ScheduleMilestone",
        back_populates="scenario",
        cascade="all, delete-orphan",
        order_by="ScheduleMilestone.start_month"
    )
