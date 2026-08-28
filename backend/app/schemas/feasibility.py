from decimal import Decimal
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class StampDutyResponse(BaseModel):
    base_stamp_duty: Decimal
    foreign_surcharge: Decimal
    total_stamp_duty: Decimal
    effective_rate_pct: Decimal

class GstMarginSchemeResponse(BaseModel):
    gst_payable: Decimal
    net_revenue_ex_gst: Decimal
    margin_scheme_applied: bool

class MarginSensitivityItem(BaseModel):
    target_margin_pct: float
    max_land_purchase_price: Decimal
    max_total_land_acquisition: Decimal

class ResidualLandValueResponse(BaseModel):
    residual_land_value_cost_target: Decimal
    max_land_acquisition_cost_target: Decimal
    target_margin_on_cost_pct: Decimal
    residual_land_value_grv_target: Decimal
    max_land_acquisition_grv_target: Decimal
    target_margin_on_grv_pct: Decimal
    margin_sensitivity: List[MarginSensitivityItem]

class FeasibilityMetricsResponse(BaseModel):
    gross_realisation_value: Decimal
    net_realisation_value: Decimal
    total_project_cost: Decimal
    total_development_cost_ex_land: Decimal
    land_acquisition_total: Decimal
    net_profit: Decimal
    margin_on_cost_pct: Decimal
    margin_on_grv_pct: Decimal
    net_profit_after_finance: Decimal
    return_on_equity_pct: Decimal
    project_irr_pct: float
    net_present_value: float
    discount_rate_pct: float

class FullFeasibilityResponse(BaseModel):
    project_id: str
    scenario_id: str
    scenario_name: str
    stamp_duty: StampDutyResponse
    gst: GstMarginSchemeResponse
    valuation_rlv: ResidualLandValueResponse
    wacc_pct: Decimal
    metrics: FeasibilityMetricsResponse

class StandaloneFeasibilityEvaluateInput(BaseModel):
    land_purchase_price: Decimal = Field(..., gt=0)
    land_deposit_amount: Optional[Decimal] = None
    state: str = "QLD"
    is_foreign_purchaser: bool = False
    cost_items: Optional[List[Dict[str, Any]]] = None
    sales_items: Optional[List[Dict[str, Any]]] = None
    use_gst_margin_scheme: bool = True
    senior_debt_enabled: bool = True
    senior_max_ltc_pct: Decimal = Decimal("70.00")
    senior_max_lvr_pct: Decimal = Decimal("65.00")
    senior_interest_rate_pct: Decimal = Decimal("8.50")
    senior_line_fee_pct: Decimal = Decimal("1.50")
    senior_establishment_fee_pct: Decimal = Decimal("1.00")
    project_duration_months: int = 24
    discount_rate_pct: float = 10.0
    target_margin_for_rlv_pct: Decimal = Decimal("20.00")
