"""
Revenue & Sales Calculation Engine.
Calculates Gross Realisation Value (GRV), selling commissions, marketing budgets, and Net Realisation Value (NRV).
"""

from decimal import Decimal
from typing import Dict, Any, List

def calculate_gross_revenue(sales_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate project sales totals, gross revenue, selling expenses, and net revenue.
    """
    total_units = 0
    total_internal_area = Decimal("0.00")
    total_external_area = Decimal("0.00")
    gross_realisation_value = Decimal("0.00")
    total_commissions = Decimal("0.00")
    total_marketing = Decimal("0.00")

    item_results = []
    for item in sales_items:
        units = int(item.get("total_units") or 1)
        int_area = Decimal(str(item.get("avg_internal_area") or 0))
        ext_area = Decimal(str(item.get("avg_external_area") or 0))
        unit_price = Decimal(str(item.get("unit_sale_price") or 0))
        price_sqm = Decimal(str(item.get("price_per_sqm") or 0))

        if unit_price <= 0 and price_sqm > 0 and int_area > 0:
            unit_price = price_sqm * int_area

        line_revenue = unit_price * units
        comm_pct = Decimal(str(item.get("sales_commission_pct") or 2.0)) / Decimal("100.0")
        mktg_pct = Decimal(str(item.get("marketing_cost_pct") or 1.5)) / Decimal("100.0")

        line_comm = line_revenue * comm_pct
        line_mktg = line_revenue * mktg_pct

        total_units += units
        total_internal_area += (int_area * units)
        total_external_area += (ext_area * units)
        gross_realisation_value += line_revenue
        total_commissions += line_comm
        total_marketing += line_mktg

        calc_price_sqm = (unit_price / int_area) if int_area > 0 else Decimal("0.00")

        item_results.append({
            **item,
            "total_units": units,
            "unit_sale_price": float(unit_price),
            "price_per_sqm": float(calc_price_sqm),
            "total_revenue": float(line_revenue),
            "total_commission": float(line_comm),
            "total_marketing": float(line_mktg)
        })

    total_selling_costs = total_commissions + total_marketing
    net_realisation_value = gross_realisation_value - total_selling_costs

    avg_price_per_unit = (gross_realisation_value / Decimal(total_units)) if total_units > 0 else Decimal("0.00")
    avg_rate_sqm = (gross_realisation_value / total_internal_area) if total_internal_area > 0 else Decimal("0.00")

    return {
        "total_units": total_units,
        "total_internal_area": total_internal_area,
        "total_external_area": total_external_area,
        "gross_realisation_value": gross_realisation_value,
        "total_commissions": total_commissions,
        "total_marketing": total_marketing,
        "total_selling_costs": total_selling_costs,
        "net_realisation_value": net_realisation_value,
        "avg_price_per_unit": avg_price_per_unit,
        "avg_rate_sqm": avg_rate_sqm,
        "items": item_results
    }
