"""
Capital Stack & Funding Calculation Engine.
Calculates senior debt sizing (LTC and LVR caps), mezzanine financing, developer equity requirements,
financing costs, and multi-tranche distribution waterfall.
"""

from decimal import Decimal
from typing import Dict, Any, Optional, List

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


def calculate_distribution_waterfall(
    available_net_proceeds: Decimal,
    tranches: List[Dict[str, Any]],
    project_duration_months: int = 24,
) -> Dict[str, Any]:
    """
    Distribute available net proceeds through a configured priority waterfall.

    Tier 1: Return of Capital — return invested capital in priority order.
    Tier 2: Preferred Return — pay hurdle rate to preferred_equity tranches.
    Tier 3: Residual Profit Split — split remaining proceeds per investor/promote split.

    Constraints:
    - Total distributions NEVER exceed available_net_proceeds.
    - Zero/negative proceeds handled gracefully — no money is created.
    - Uses Decimal throughout; reconciliation_difference must be exactly 0.
    """
    proceeds = available_net_proceeds if available_net_proceeds is not None else Decimal("0.00")
    remaining = proceeds

    # Sort tranches by priority_order ascending
    sorted_tranches = sorted(tranches, key=lambda t: int(t.get("priority_order", 1)))

    tier1_items = []
    tier2_items = []
    tier3_items = []
    total_distributed = Decimal("0.00")
    years = Decimal(str(max(1, project_duration_months))) / Decimal("12.0")

    # ─── TIER 1: Return of Capital ───────────────────────────────────────────
    for t in sorted_tranches:
        capital = Decimal(str(t.get("amount") or 0))
        distribution = min(capital, max(Decimal("0.00"), remaining))
        remaining -= distribution
        total_distributed += distribution
        tier1_items.append({
            "tranche_id": t.get("id", ""),
            "tranche_name": t.get("name", ""),
            "tranche_type": t.get("tranche_type", ""),
            "priority_order": t.get("priority_order", 1),
            "capital_returned": distribution,
        })

    # ─── TIER 2: Preferred Equity Return ─────────────────────────────────────
    for t in sorted_tranches:
        if t.get("tranche_type") != "preferred_equity":
            continue
        capital = Decimal(str(t.get("amount") or 0))
        hurdle = Decimal(str(t.get("hurdle_rate_pct") or 0)) / Decimal("100.0")
        preferred_return = capital * hurdle * years
        distribution = min(preferred_return, max(Decimal("0.00"), remaining))
        remaining -= distribution
        total_distributed += distribution
        tier2_items.append({
            "tranche_id": t.get("id", ""),
            "tranche_name": t.get("name", ""),
            "tranche_type": t.get("tranche_type", ""),
            "priority_order": t.get("priority_order", 1),
            "preferred_return_target": round(preferred_return, 2),
            "preferred_return_paid": round(distribution, 2),
            "shortfall": round(preferred_return - distribution, 2),
        })

    # ─── TIER 3: Residual Profit Split ───────────────────────────────────────
    residual = max(Decimal("0.00"), remaining)
    for t in sorted_tranches:
        if t.get("tranche_type") != "ordinary_equity":
            continue
        investor_pct = Decimal(str(t.get("investor_split_pct") or 80)) / Decimal("100.0")
        promote_pct = Decimal(str(t.get("developer_promote_pct") or 20)) / Decimal("100.0")
        investor_share = round(residual * investor_pct, 2)
        promote_share = round(residual * promote_pct, 2)
        # Precision correction: ensure investor+promote = residual
        rounding_diff = residual - investor_share - promote_share
        investor_share += rounding_diff
        distribution = investor_share + promote_share
        remaining -= distribution
        total_distributed += distribution
        residual -= distribution
        tier3_items.append({
            "tranche_id": t.get("id", ""),
            "tranche_name": t.get("name", ""),
            "tranche_type": t.get("tranche_type", ""),
            "priority_order": t.get("priority_order", 1),
            "investor_split_pct": float(investor_pct * 100),
            "developer_promote_pct": float(promote_pct * 100),
            "investor_distribution": investor_share,
            "developer_promote_distribution": promote_share,
            "total_distribution": distribution,
        })

    # ─── Reconciliation ──────────────────────────────────────────────────────
    # For negative proceeds: remaining is negative after clamping to 0 in Tier 1
    # proceeds = total_distributed + unclaimed_remaining
    # unclaimed_remaining = max(0, remaining) for distribution purposes
    # reconciliation_difference should be 0 for valid waterfalls
    # For negative proceeds: we never distribute, remaining_proceeds=0,
    # so reconciliation_difference = proceeds - 0 - 0 = proceeds (negative)
    # Instead: reconcile as proceeds - total_distributed - remaining_proceeds where remaining_proceeds=max(0,remaining)
    remaining_proceeds_display = max(Decimal("0.00"), remaining)
    reconciliation_difference = proceeds - total_distributed - remaining_proceeds_display

    return {
        "available_proceeds": round(proceeds, 2),
        "total_distributed": round(total_distributed, 2),
        "remaining_proceeds": round(remaining_proceeds_display, 2),
        "reconciliation_difference": round(reconciliation_difference, 2),
        "tier1_return_of_capital": tier1_items,
        "tier2_preferred_return": tier2_items,
        "tier3_residual_split": tier3_items,
    }

