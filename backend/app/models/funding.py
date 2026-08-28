import uuid
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Numeric, Boolean, Integer, ForeignKey
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


class FundingTranche(Base, TimestampMixin):
    """
    Multi-tranche funding model supporting unlimited tranches per scenario.
    Supports senior_debt, mezzanine, preferred_equity, ordinary_equity.
    """
    __tablename__ = "funding_tranches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    tranche_type: Mapped[str] = mapped_column(String(50), default="ordinary_equity", nullable=False)
    # senior_debt | mezzanine | preferred_equity | ordinary_equity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    priority_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # Amount invested in this tranche
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)

    # Rate or hurdle for preferred equity
    hurdle_rate_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("0.00"), nullable=False)

    # For residual profit split tranches (ordinary_equity)
    investor_split_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("80.00"), nullable=False)
    developer_promote_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("20.00"), nullable=False)
