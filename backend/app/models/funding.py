import uuid
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.scenario import Scenario

class FundingAssumption(Base, TimestampMixin):
    __tablename__ = "funding_assumptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # Senior Debt Facility
    senior_debt_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    senior_max_ltc_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("70.00"), nullable=False)
    senior_max_lvr_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("65.00"), nullable=False)
    senior_interest_rate_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("8.50"), nullable=False)
    senior_line_fee_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("1.50"), nullable=False)
    senior_establishment_fee_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("1.00"), nullable=False)

    # Mezzanine Debt
    mezzanine_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mezzanine_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    mezzanine_interest_rate_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("15.00"), nullable=False)

    # Developer Equity
    target_equity_contribution: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=True)

    # Relationships
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="funding_assumption")
