from typing import List, Optional
from pydantic import BaseModel

class MonthlyCashFlow(BaseModel):
    month: int
    period_label: str
    land_cost: Optional[float] = 0.0
    construction_cost: float
    consultant_cost: Optional[float] = 0.0
    statutory_holding_cost: Optional[float] = 0.0
    acquisition_cost: Optional[float] = 0.0
    total_outflow: Optional[float] = 0.0
    revenue: float
    net_cashflow: float
    cumulative_cashflow: float
    debt_drawdown: Optional[float] = 0.0
    cumulative_debt: Optional[float] = 0.0

class CashFlowSummary(BaseModel):
    project_duration_months: int
    total_revenue: float
    total_costs: float
    net_profit: float
    project_irr: float
    peak_debt: float
    monthly_data: List[MonthlyCashFlow]
