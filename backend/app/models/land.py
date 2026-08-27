import uuid
import datetime
from decimal import Decimal
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Date, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.scenario import Scenario

class LandInput(Base, TimestampMixin):
    __tablename__ = "land_inputs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # Land Purchase (Monetary & Dates)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    deposit_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=True)
    deposit_due_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    contract_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    settlement_date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)

    # Site Information
    site_area: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    site_area_unit: Mapped[str] = mapped_column(String(50), default="m²", nullable=False)
    current_zoning: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    existing_improvements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    planning_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    development_potential_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="land_input")
    acquisition_costs: Mapped[List["AcquisitionCostItem"]] = relationship(
        "AcquisitionCostItem",
        back_populates="land_input",
        cascade="all, delete-orphan",
        order_by="AcquisitionCostItem.created_at"
    )

class AcquisitionCostItem(Base, TimestampMixin):
    __tablename__ = "acquisition_cost_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    land_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("land_inputs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    category: Mapped[str] = mapped_column(String(100), default="other", nullable=False)  # stamp_duty, legal_fees, due_diligence, valuation_fees, agent_fees, other
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)

    land_input: Mapped["LandInput"] = relationship("LandInput", back_populates="acquisition_costs")
