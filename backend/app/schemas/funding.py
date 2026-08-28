from typing import Optional, List
from decimal import Decimal
import datetime
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict

class FundingAssumptionBase(BaseModel):
    senior_debt_enabled: bool = True
    senior_max_ltc_pct: Decimal = Decimal("70.00")
    senior_max_lvr_pct: Decimal = Decimal("65.00")
    senior_interest_rate_pct: Decimal = Decimal("8.50")
    senior_line_fee_pct: Decimal = Decimal("1.50")
    senior_establishment_fee_pct: Decimal = Decimal("1.00")
    
    mezzanine_enabled: bool = False
    mezzanine_amount: Decimal = Decimal("0.00")
    mezzanine_interest_rate_pct: Decimal = Decimal("15.00")

    target_equity_contribution: Optional[Decimal] = Decimal("0.00")

class FundingAssumptionUpdate(FundingAssumptionBase):
    pass

class FundingAssumptionRead(FundingAssumptionBase):
    id: str
    scenario_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class FundingCalculationSummary(BaseModel):
    senior_debt_facility_limit: Decimal
    senior_ltc_cap: Decimal
    senior_lvr_cap: Decimal
    constraining_factor: str
    mezzanine_facility_limit: Decimal
    total_debt_facility: Decimal
    required_developer_equity: Decimal
    debt_percentage: Decimal
    equity_percentage: Decimal
    senior_establishment_fee: Decimal
    senior_interest_cost: Decimal
    senior_line_fee: Decimal
    mezzanine_interest_cost: Decimal
    total_estimated_finance_cost: Decimal
    net_profit_after_finance: Decimal
    return_on_equity_pct: Decimal

class FundingSummaryResponse(BaseModel):
    assumption: FundingAssumptionRead
    summary: FundingCalculationSummary


# ─── Phase 2: Multi-Tranche & Waterfall Schemas ──────────────────────────────

class FundingTrancheBase(BaseModel):
    tranche_type: str = "ordinary_equity"  # senior_debt | mezzanine | preferred_equity | ordinary_equity
    name: str
    priority_order: int = 1
    amount: Decimal = Decimal("0.00")
    hurdle_rate_pct: Decimal = Decimal("0.00")
    investor_split_pct: Decimal = Decimal("80.00")
    developer_promote_pct: Decimal = Decimal("20.00")

class FundingTrancheCreate(FundingTrancheBase):
    pass

class FundingTrancheUpdate(FundingTrancheBase):
    pass

class FundingTrancheRead(FundingTrancheBase):
    id: str
    scenario_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class WaterfallTier1Item(BaseModel):
    tranche_id: str
    tranche_name: str
    tranche_type: str
    priority_order: int
    capital_returned: Decimal

class WaterfallTier2Item(BaseModel):
    tranche_id: str
    tranche_name: str
    tranche_type: str
    priority_order: int
    preferred_return_target: Decimal
    preferred_return_paid: Decimal
    shortfall: Decimal

class WaterfallTier3Item(BaseModel):
    tranche_id: str
    tranche_name: str
    tranche_type: str
    priority_order: int
    investor_split_pct: float
    developer_promote_pct: float
    investor_distribution: Decimal
    developer_promote_distribution: Decimal
    total_distribution: Decimal

class WaterfallResult(BaseModel):
    available_proceeds: Decimal
    total_distributed: Decimal
    remaining_proceeds: Decimal
    reconciliation_difference: Decimal
    tier1_return_of_capital: List[WaterfallTier1Item]
    tier2_preferred_return: List[WaterfallTier2Item]
    tier3_residual_split: List[WaterfallTier3Item]

class WaterfallResponse(BaseModel):
    tranches: List[FundingTrancheRead]
    waterfall: WaterfallResult
    net_profit_after_finance: Decimal

