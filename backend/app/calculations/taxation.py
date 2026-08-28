"""
Australian Property Taxation & Statutory Duty Engine.
Calculates State Transfer (Stamp) Duty and GST (including the Australian Margin Scheme).
"""

from decimal import Decimal
from typing import Dict, Any, Optional

STATE_STAMP_DUTY_RATES = {
    # Standard general transfer duty calculation brackets (approximate state scales)
    "NSW": [
        (Decimal("0"), Decimal("17000"), Decimal("0.0125"), Decimal("0")),
        (Decimal("17000"), Decimal("36000"), Decimal("0.0150"), Decimal("212.50")),
        (Decimal("36000"), Decimal("93000"), Decimal("0.0200"), Decimal("497.50")),
        (Decimal("93000"), Decimal("351000"), Decimal("0.0350"), Decimal("1637.50")),
        (Decimal("351000"), Decimal("1168000"), Decimal("0.0450"), Decimal("10667.50")),
        (Decimal("1168000"), Decimal("999999999"), Decimal("0.0550"), Decimal("47432.50")),
    ],
    "VIC": [
        (Decimal("0"), Decimal("25000"), Decimal("0.014"), Decimal("0")),
        (Decimal("25000"), Decimal("130000"), Decimal("0.024"), Decimal("350.00")),
        (Decimal("130000"), Decimal("960000"), Decimal("0.060"), Decimal("2870.00")),
        (Decimal("960000"), Decimal("2000000"), Decimal("0.055"), Decimal("52670.00")),
        (Decimal("2000000"), Decimal("999999999"), Decimal("0.065"), Decimal("109870.00")),
    ],
    "QLD": [
        (Decimal("0"), Decimal("5000"), Decimal("0.00"), Decimal("0")),
        (Decimal("5000"), Decimal("75000"), Decimal("0.015"), Decimal("0")),
        (Decimal("75000"), Decimal("540000"), Decimal("0.035"), Decimal("1050.00")),
        (Decimal("540000"), Decimal("1000000"), Decimal("0.045"), Decimal("17325.00")),
        (Decimal("1000000"), Decimal("999999999"), Decimal("0.0575"), Decimal("38025.00")),
    ],
}

def calculate_stamp_duty(
    purchase_price: Decimal,
    state: str = "QLD",
    is_foreign_purchaser: bool = False
) -> Dict[str, Decimal]:
    """
    Calculate state transfer (stamp) duty for property acquisition.
    """
    price = purchase_price if purchase_price is not None else Decimal("0.00")
    if price <= Decimal("0.00"):
        return {
            "base_stamp_duty": Decimal("0.00"),
            "foreign_surcharge": Decimal("0.00"),
            "total_stamp_duty": Decimal("0.00"),
            "effective_rate_pct": Decimal("0.00"),
        }

    st = state.upper().strip()
    brackets = STATE_STAMP_DUTY_RATES.get(st, STATE_STAMP_DUTY_RATES["QLD"])

    base_duty = Decimal("0.00")
    for lower, upper, rate, base in brackets:
        if price > lower:
            taxable_in_tier = min(price, upper) - lower
            base_duty = base + (taxable_in_tier * rate)

    # Foreign buyer surcharge (approx 8% in NSW/VIC/QLD)
    foreign_surcharge = price * Decimal("0.08") if is_foreign_purchaser else Decimal("0.00")
    total_duty = base_duty + foreign_surcharge
    effective_rate = (total_duty / price * Decimal("100.0")) if price > 0 else Decimal("0.00")

    return {
        "base_stamp_duty": round(base_duty, 2),
        "foreign_surcharge": round(foreign_surcharge, 2),
        "total_stamp_duty": round(total_duty, 2),
        "effective_rate_pct": round(effective_rate, 2),
    }

def calculate_gst_margin_scheme(
    gross_sale_price: Decimal,
    land_purchase_price: Decimal,
    use_margin_scheme: bool = True
) -> Dict[str, Decimal]:
    """
    Calculate GST liability for Australian property development.
    Under Margin Scheme: GST = (Sale Price - Purchase Price) / 11
    Under Standard GST: GST = Sale Price / 11
    """
    sale_price = gross_sale_price if gross_sale_price is not None else Decimal("0.00")
    land_cost = land_purchase_price if land_purchase_price is not None else Decimal("0.00")

    if sale_price <= Decimal("0.00"):
        return {
            "gst_payable": Decimal("0.00"),
            "net_revenue_ex_gst": Decimal("0.00"),
            "margin_scheme_applied": use_margin_scheme,
        }

    if use_margin_scheme and sale_price > land_cost:
        margin = sale_price - land_cost
        gst_payable = margin / Decimal("11.0")
    else:
        gst_payable = sale_price / Decimal("11.0")

    net_rev = sale_price - gst_payable

    return {
        "gst_payable": round(gst_payable, 2),
        "net_revenue_ex_gst": round(net_rev, 2),
        "margin_scheme_applied": use_margin_scheme,
    }
