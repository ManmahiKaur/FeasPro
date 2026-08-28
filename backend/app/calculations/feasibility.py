"""
Feasibility Metrics, NPV, WACC & Returns Engine.
Calculates Net Profit, Development Margin on Cost, Margin on GRV, Project IRR, Equity IRR, and Net Present Value.
"""

from decimal import Decimal
from typing import Dict, Any, List, Optional
import math
from backend.app.calculations.cashflow import calculate_irr_from_cashflows

def calculate_npv_from_cashflows(
    cashflows: List[float],
    annual_discount_rate_pct: float = 10.0
) -> float:
    """
    Calculate Net Present Value (NPV) from monthly cash flow schedule.
    Converts annual discount rate to compounding monthly discount rate.
    """
    if not cashflows:
        return 0.0

    r_annual = annual_discount_rate_pct / 100.0
    r_monthly = ((1.0 + r_annual) ** (1.0 / 12.0)) - 1.0

    npv_val = 0.0
    for month, cf in enumerate(cashflows):
        discount_factor = (1.0 + r_monthly) ** month
        npv_val += (cf / discount_factor)

    return round(npv_val, 2)

def calculate_wacc(
    debt_amount: Decimal,
    equity_amount: Decimal,
    cost_of_debt_pct: Decimal = Decimal("8.50"),
    cost_of_equity_pct: Decimal = Decimal("18.00"),
    tax_rate_pct: Decimal = Decimal("30.00")
) -> Decimal:
    """
    Calculate Weighted Average Cost of Capital (WACC).
    """
    total_capital = debt_amount + equity_amount
    if total_capital <= Decimal("0.00"):
        return Decimal("0.00")

    debt_weight = debt_amount / total_capital
    equity_weight = equity_amount / total_capital

    after_tax_debt_rate = (cost_of_debt_pct / Decimal("100.0")) * (Decimal("1.0") - (tax_rate_pct / Decimal("100.0")))
    equity_rate = cost_of_equity_pct / Decimal("100.0")

    wacc_rate = (debt_weight * after_tax_debt_rate) + (equity_weight * equity_rate)
    return round(wacc_rate * Decimal("100.0"), 2)

def evaluate_feasibility_metrics(
    gross_realisation_value: Decimal,
    net_realisation_value: Decimal,
    total_project_cost: Decimal,
    total_development_cost_ex_land: Decimal = Decimal("0.00"),
    land_acquisition_total: Decimal = Decimal("0.00"),
    required_equity: Optional[Decimal] = None,
    total_finance_cost: Decimal = Decimal("0.00"),
    monthly_cashflows: Optional[List[float]] = None,
    discount_rate_pct: float = 10.0
) -> Dict[str, Any]:
    """
    Evaluate comprehensive property development feasibility financial KPIs.
    """
    grv = gross_realisation_value if gross_realisation_value is not None else Decimal("0.00")
    nrv = net_realisation_value if net_realisation_value is not None else Decimal("0.00")
    cost = total_project_cost if total_project_cost is not None else Decimal("0.00")

    net_profit = nrv - cost

    margin_on_cost = (
        (net_profit / cost * Decimal("100.0"))
        if cost > Decimal("0.00")
        else Decimal("0.00")
    )

    margin_on_grv = (
        (net_profit / grv * Decimal("100.0"))
        if grv > Decimal("0.00")
        else Decimal("0.00")
    )

    profit_after_finance = net_profit - total_finance_cost

    equity = required_equity if required_equity and required_equity > 0 else (cost * Decimal("0.30"))
    return_on_equity = (
        (profit_after_finance / equity * Decimal("100.0"))
        if equity > Decimal("0.00")
        else Decimal("0.00")
    )

    irr = 0.0
    npv = 0.0
    if monthly_cashflows:
        irr = calculate_irr_from_cashflows(monthly_cashflows)
        npv = calculate_npv_from_cashflows(monthly_cashflows, discount_rate_pct)

    return {
        "gross_realisation_value": grv,
        "net_realisation_value": nrv,
        "total_project_cost": cost,
        "total_development_cost_ex_land": total_development_cost_ex_land,
        "land_acquisition_total": land_acquisition_total,
        "net_profit": net_profit,
        "margin_on_cost_pct": round(margin_on_cost, 2),
        "margin_on_grv_pct": round(margin_on_grv, 2),
        "net_profit_after_finance": profit_after_finance,
        "return_on_equity_pct": round(return_on_equity, 2),
        "project_irr_pct": irr,
        "net_present_value": npv,
        "discount_rate_pct": discount_rate_pct
    }
