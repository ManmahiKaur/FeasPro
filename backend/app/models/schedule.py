import uuid
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.scenario import Scenario

class ScheduleMilestone(Base, TimestampMixin):
    __tablename__ = "schedule_milestones"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    stage: Mapped[str] = mapped_column(String(50), default="construction", nullable=False)  # acquisition, planning_da, presales, civil_demo, construction, titling, settlement
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_month: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    duration_months: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    end_month: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="planned", nullable=False)  # planned, in_progress, completed
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="schedule_milestones")
