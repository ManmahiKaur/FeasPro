"""
FeasPro Core Financial Calculation Engine (Phase 1 Foundation).

All financial calculations, residual land valuation models, taxation, cash flow phasing,
and return metrics are strictly deterministic in this calculation layer.
"""

from backend.app.calculations.taxation import (
    calculate_stamp_duty,
    calculate_gst_margin_scheme,
    STATE_STAMP_DUTY_RATES,
)
from backend.app.calculations.costs import (
    calculate_land_acquisition_totals,
    calculate_development_costs,
)
from backend.app.calculations.revenue import (
    calculate_gross_revenue,
)
from backend.app.calculations.funding import (
    calculate_funding_capital_stack,
)
from backend.app.calculations.cashflow import (
    calculate_s_curve_weights,
    calculate_irr_from_cashflows,
    generate_cash_flow_schedule,
)
from backend.app.calculations.valuation import (
    calculate_residual_land_value,
)
from backend.app.calculations.feasibility import (
    evaluate_feasibility_metrics,
    calculate_npv_from_cashflows,
    calculate_wacc,
)
from backend.app.calculations.engine import (
    FeasibilityCoreEngine,
)

__all__ = [
    "calculate_stamp_duty",
    "calculate_gst_margin_scheme",
    "STATE_STAMP_DUTY_RATES",
    "calculate_land_acquisition_totals",
    "calculate_development_costs",
    "calculate_gross_revenue",
    "calculate_funding_capital_stack",
    "calculate_s_curve_weights",
    "calculate_irr_from_cashflows",
    "generate_cash_flow_schedule",
    "calculate_residual_land_value",
    "evaluate_feasibility_metrics",
    "calculate_npv_from_cashflows",
    "calculate_wacc",
    "FeasibilityCoreEngine",
]
