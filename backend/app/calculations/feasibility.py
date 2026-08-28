"""
Feasibility Metrics & Return Engine.
Calculates Net Profit, Development Margin on Cost (TDC), Margin on GRV, and residual return metrics.
"""

from decimal import Decimal
from typing import Dict, Any

def evaluate_feasibility_metrics(
    gross_realisation_value: Decimal,
    net_realisation_value: Decimal,
    total_project_cost: Decimal,
    total_development_cost_ex_land: Decimal = Decimal("0.00"),
    land_acquisition_total: Decimal = Decimal("0.00")
) -> Dict[str, Any]:
    """
    Evaluate key property development feasibility financial KPIs.
    """
    net_profit = net_realisation_value - total_project_cost

    margin_on_cost = (
        (net_profit / total_project_cost * Decimal("100.0"))
        if total_project_cost > Decimal("0.00")
        else Decimal("0.00")
    )

    margin_on_grv = (
        (net_profit / gross_realisation_value * Decimal("100.0"))
        if gross_realisation_value > Decimal("0.00")
        else Decimal("0.00")
    )

    return {
        "gross_realisation_value": gross_realisation_value,
        "net_realisation_value": net_realisation_value,
        "total_project_cost": total_project_cost,
        "total_development_cost_ex_land": total_development_cost_ex_land,
        "land_acquisition_total": land_acquisition_total,
        "net_profit": net_profit,
        "margin_on_cost_pct": margin_on_cost,
        "margin_on_grv_pct": margin_on_grv,
    }
