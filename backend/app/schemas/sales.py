from typing import List, Optional
from decimal import Decimal
import datetime
from pydantic import BaseModel, ConfigDict

class SalesProductItemBase(BaseModel):
    name: str
    unit_type: str = "residential_2bed"
    total_units: int = 1
    avg_internal_area: Decimal = Decimal("0.00")
    avg_external_area: Decimal = Decimal("0.00")
    price_per_sqm: Optional[Decimal] = Decimal("0.00")
    unit_sale_price: Decimal = Decimal("0.00")
    total_revenue: Decimal = Decimal("0.00")
    sales_commission_pct: Decimal = Decimal("2.00")
    marketing_cost_pct: Decimal = Decimal("1.50")
    gst_applicable: bool = True
    sales_start_month: int = 1
    sales_end_month: int = 12
    settlement_month: int = 18
    notes: Optional[str] = None

class SalesProductItemCreate(SalesProductItemBase):
    pass

class SalesProductItemRead(SalesProductItemBase):
    id: str
    scenario_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class SalesCalculationSummary(BaseModel):
    total_units: int
    total_internal_area: Decimal
    total_external_area: Decimal
    gross_realisation_value: Decimal
    total_commissions: Decimal
    total_marketing: Decimal
    total_selling_costs: Decimal
    net_realisation_value: Decimal
    avg_price_per_unit: Decimal
    avg_rate_sqm: Decimal

class SalesSummaryResponse(BaseModel):
    summary: SalesCalculationSummary
    items: List[SalesProductItemRead]

class BatchSalesUpdateInput(BaseModel):
    items: List[SalesProductItemCreate]
