"""
Development Costs & Land Valuation Calculation Engine.
Provides deterministic calculations for Land Acquisition, Cost subtotals, and balance schedules.
"""

from decimal import Decimal
from typing import Dict, Any, Iterable, Optional

def calculate_land_acquisition_totals(
    purchase_price: Decimal,
    deposit_amount: Optional[Decimal] = None,
    cost_amounts: Optional[Iterable[Decimal]] = None
) -> Dict[str, Decimal]:
    """
    Calculate deterministic land acquisition subtotals.
    
    Formulas:
    - Total Acquisition Costs = sum(cost_amounts)
    - Total Land Acquisition = purchase_price + Total Acquisition Costs
    - Remaining Purchase Amount = max(0, purchase_price - (deposit_amount or 0))
    """
    p_price = purchase_price if purchase_price is not None else Decimal("0.00")
    d_amount = deposit_amount if deposit_amount is not None else Decimal("0.00")
    
    total_costs = Decimal("0.00")
    if cost_amounts:
        for amt in cost_amounts:
            if amt is not None:
                total_costs += amt
                
    total_acquisition = p_price + total_costs
    remaining_purchase = p_price - d_amount
    if remaining_purchase < Decimal("0.00"):
        remaining_purchase = Decimal("0.00")

    return {
        "purchase_price": p_price,
        "deposit_amount": d_amount,
        "total_acquisition_costs": total_costs,
        "total_land_acquisition": total_acquisition,
        "remaining_purchase_amount": remaining_purchase,
    }

def calculate_development_costs(*args, **kwargs) -> Dict[str, Any]:
    """Placeholder for Phase 3/4 full construction and consultant cost calculations."""
    raise NotImplementedError("Full construction cost engine will be implemented in future phases.")
