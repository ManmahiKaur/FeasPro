import uuid
from decimal import Decimal
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, Numeric, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from backend.app.models.scenario import Scenario

class SalesProductItem(Base, TimestampMixin):
    __tablename__ = "sales_product_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("scenarios.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit_type: Mapped[str] = mapped_column(String(50), default="residential_2bed", nullable=False)
    
    total_units: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    avg_internal_area: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    avg_external_area: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    
    price_per_sqm: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=True)
    unit_sale_price: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    total_revenue: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=Decimal("0.00"), nullable=False)
    
    sales_commission_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("2.00"), nullable=False)
    marketing_cost_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal("1.50"), nullable=False)
    gst_applicable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    sales_start_month: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    sales_end_month: Mapped[int] = mapped_column(Integer, default=12, nullable=False)
    settlement_month: Mapped[int] = mapped_column(Integer, default=18, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="sales_products")
