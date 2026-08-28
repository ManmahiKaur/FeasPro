"""
Capital Stack & Funding Calculation Engine.
Calculates senior debt sizing (LTC and LVR caps), mezzanine financing, developer equity requirements, and financing costs.
"""

from decimal import Decimal
from typing import Dict, Any, Optional

def calculate_funding_capital_stack(
    total_project_cost: Decimal,
    gross_realisation_value: Decimal,
    senior_debt_enabled: bool = True,
    senior_max_ltc_pct: Decimal = Decimal("70.00"),
    senior_max_lvr_pct: Decimal = Decimal("65.00"),
    senior_interest_rate_pct: Decimal = Decimal("8.50"),
    senior_line_fee_pct: Decimal = Decimal("1.50"),
    senior_establishment_fee_pct: Decimal = Decimal("1.00"),
    mezzanine_enabled: bool = False,
    mezzanine_amount: Decimal = Decimal("0.00"),
    mezzanine_interest_rate_pct: Decimal = Decimal("15.00"),
    project_duration_months: int = 24,
    net_profit_before_finance: Optional[Decimal] = None
) -> Dict[str, Any]:
    """
    Calculate full capital stack breakdown, loan facility limits, and finance costs.
    """
    cost = total_project_cost if total_project_cost is not None else Decimal("0.00")
    grv = gross_realisation_value if gross_realisation_value is not None else Decimal("0.00")

    # 1. Senior Debt Sizing
    ltc_cap = cost * (senior_max_ltc_pct / Decimal("100.0"))
    lvr_cap = grv * (senior_max_lvr_pct / Decimal("100.0"))

    if senior_debt_enabled:
        senior_limit = min(ltc_cap, lvr_cap) if lvr_cap > 0 else ltc_cap
        constraining_factor = "LTC (Cost)" if ltc_cap <= lvr_cap else "LVR (Gross Value)"
    else:
        senior_limit = Decimal("0.00")
        constraining_factor = "None (100% Equity)"

    # 2. Mezzanine Debt
    mezz_limit = mezzanine_amount if (mezzanine_enabled and mezzanine_amount > 0) else Decimal("0.00")

    # 3. Capital Stack Sum
    total_debt = senior_limit + mezz_limit
    if total_debt > cost:
        # Cap debt at project cost
        total_debt = cost
        if mezz_limit > (cost - senior_limit):
            mezz_limit = max(Decimal("0.00"), cost - senior_limit)

    required_equity = max(Decimal("0.00"), cost - total_debt)

    debt_pct = (total_debt / cost * Decimal("100.0")) if cost > 0 else Decimal("0.00")
    equity_pct = (required_equity / cost * Decimal("100.0")) if cost > 0 else Decimal("0.00")

    # 4. Financing Costs Estimation
    years = Decimal(str(max(1, project_duration_months))) / Decimal("12.0")
    senior_establishment = senior_limit * (senior_establishment_fee_pct / Decimal("100.0"))
    
    # 55% average debt drawn during construction phasing
    avg_senior_drawn = senior_limit * Decimal("0.55")
    senior_interest = avg_senior_drawn * (senior_interest_rate_pct / Decimal("100.0")) * years
    senior_line_fee = senior_limit * (senior_line_fee_pct / Decimal("100.0")) * years

    mezz_interest = mezz_limit * (mezzanine_interest_rate_pct / Decimal("100.0")) * years

    total_finance_cost = senior_establishment + senior_interest + senior_line_fee + mezz_interest

    # 5. Return on Equity (ROE)
    profit = net_profit_before_finance if net_profit_before_finance is not None else Decimal("0.00")
    net_profit_after_finance = profit - total_finance_cost

    return_on_equity_pct = (
        (net_profit_after_finance / required_equity * Decimal("100.0"))
        if required_equity > Decimal("0.00")
        else Decimal("0.00")
    )

    return {
        "senior_debt_facility_limit": senior_limit,
        "senior_ltc_cap": ltc_cap,
        "senior_lvr_cap": lvr_cap,
        "constraining_factor": constraining_factor,
        "mezzanine_facility_limit": mezz_limit,
        "total_debt_facility": total_debt,
        "required_developer_equity": required_equity,
        "debt_percentage": debt_pct,
        "equity_percentage": equity_pct,
        "senior_establishment_fee": senior_establishment,
        "senior_interest_cost": senior_interest,
        "senior_line_fee": senior_line_fee,
        "mezzanine_interest_cost": mezz_interest,
        "total_estimated_finance_cost": total_finance_cost,
        "net_profit_after_finance": net_profit_after_finance,
        "return_on_equity_pct": return_on_equity_pct,
    }
