import uuid
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Numeric, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.scenario import Scenario

class CostItem(Base, TimestampMixin):
    __tablename__ = "cost_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    category: Mapped[str] = mapped_column(String(50), default="construction", nullable=False)  # construction, consultants, statutory, contingency, holding, other
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    calculation_method: Mapped[str] = mapped_column(String(50), default="fixed_amount", nullable=False)  # fixed_amount, rate_per_sqm, percent_construction
    gst_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    quantity: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    rate: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    phasing_curve: Mapped[str] = mapped_column(String(50), default="s_curve", nullable=False)  # s_curve, linear, upfront, end
    start_month: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    end_month: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="cost_items")
