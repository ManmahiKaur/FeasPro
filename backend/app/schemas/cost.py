from typing import List, Optional
from decimal import Decimal
import datetime
from pydantic import BaseModel, ConfigDict

class CostItemBase(BaseModel):
    category: str = "construction"  # construction, consultants, statutory, contingency, holding, other
    name: str
    calculation_method: str = "fixed_amount"  # fixed_amount, rate_per_sqm, percent_construction
    quantity: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    amount: Decimal = Decimal("0.00")
    phasing_curve: str = "s_curve"  # s_curve, linear, upfront, end
    start_month: int = 1
    end_month: int = 12
    notes: Optional[str] = None

class CostItemCreate(CostItemBase):
    pass

class CostItemUpdate(BaseModel):
    id: Optional[str] = None
    category: Optional[str] = None
    name: Optional[str] = None
    calculation_method: Optional[str] = None
    quantity: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    phasing_curve: Optional[str] = None
    start_month: Optional[int] = None
    end_month: Optional[int] = None
    notes: Optional[str] = None

class CostItemRead(CostItemBase):
    id: str
    scenario_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class CostCalculationSummary(BaseModel):
    construction_subtotal: Decimal
    consultants_subtotal: Decimal
    statutory_subtotal: Decimal
    contingency_subtotal: Decimal
    holding_subtotal: Decimal
    other_subtotal: Decimal
    total_development_cost_ex_land: Decimal
    land_acquisition_total: Decimal
    total_project_cost: Decimal

class CostSummaryResponse(BaseModel):
    summary: CostCalculationSummary
    items: List[CostItemRead]

class BatchCostUpdateInput(BaseModel):
    items: List[CostItemCreate]
