"""
Development Costs & Land Valuation Calculation Engine.
Provides deterministic calculations for Land Acquisition, Construction, Consultant, and Development Costs.
"""

from decimal import Decimal
from typing import Dict, Any, Iterable, Optional, List

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

def calculate_development_costs(
    cost_items: List[Dict[str, Any]],
    land_acquisition_total: Decimal = Decimal("0.00")
) -> Dict[str, Any]:
    """
    Calculate development cost subtotals by category and overall project totals.
    
    Categories:
    - construction
    - consultants
    - statutory
    - contingency
    - holding
    - other
    """
    categories: Dict[str, Decimal] = {
        "construction": Decimal("0.00"),
        "consultants": Decimal("0.00"),
        "statutory": Decimal("0.00"),
        "contingency": Decimal("0.00"),
        "holding": Decimal("0.00"),
        "other": Decimal("0.00"),
    }
    
    total_input_tax_credits = Decimal("0.00")

    item_results = []
    for item in cost_items:
        category = item.get("category", "other")
        calc_method = item.get("calculation_method", "fixed_amount")
        quantity = Decimal(str(item.get("quantity") or 0))
        rate = Decimal(str(item.get("rate") or 0))
        amount = Decimal(str(item.get("amount") or 0))
        gst_applicable = item.get("gst_applicable", True)

        # If rate per sqm or unit specified, compute amount
        if calc_method == "rate_per_sqm" and quantity > 0 and rate > 0:
            computed_amount = quantity * rate
        else:
            computed_amount = amount

        if category in categories:
            categories[category] += computed_amount
        else:
            categories["other"] += computed_amount
            
        if gst_applicable:
            total_input_tax_credits += (computed_amount * Decimal("0.10"))

        item_results.append({
            **item,
            "amount": float(computed_amount)
        })

    tdc_ex_land = sum(categories.values())
    total_project_cost = land_acquisition_total + tdc_ex_land

    return {
        "construction_subtotal": categories["construction"],
        "consultants_subtotal": categories["consultants"],
        "statutory_subtotal": categories["statutory"],
        "contingency_subtotal": categories["contingency"],
        "holding_subtotal": categories["holding"],
        "other_subtotal": categories["other"],
        "total_input_tax_credits": total_input_tax_credits,
        "total_development_cost_ex_land": tdc_ex_land,
        "land_acquisition_total": land_acquisition_total,
        "total_project_cost": total_project_cost,
        "items": item_results
    }
