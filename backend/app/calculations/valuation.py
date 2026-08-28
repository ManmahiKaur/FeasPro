"""
Residual Land Value (RLV) & Valuation Feasibility Engine.
Calculates maximum supportable land purchase price based on target developer margin and return hurdles.
"""

from decimal import Decimal
from typing import Dict, Any, Optional

def calculate_residual_land_value(
    net_realisation_value: Decimal,
    total_development_cost_ex_land: Decimal,
    target_margin_on_cost_pct: Decimal = Decimal("20.00"),
    target_margin_on_grv_pct: Optional[Decimal] = None,
    gross_realisation_value: Optional[Decimal] = None,
    estimated_stamp_duty_rate_pct: Decimal = Decimal("5.50"),
    estimated_acquisition_cost_fixed: Decimal = Decimal("0.00")
) -> Dict[str, Any]:
    """
    Calculate the Residual Land Value (RLV) given a target developer return hurdle.
    
    1. Margin on Cost Method:
       Max Total Land Acquisition = (Net Revenue / (1 + Target Margin)) - TDC ex Land
       Max Land Purchase Price = (Max Total Land Acquisition - Fixed Costs) / (1 + Stamp Duty Rate)
       
    2. Margin on GRV Method:
       Max Total Project Cost = Net Revenue - (GRV * Target Margin on GRV)
       Max Total Land Acquisition = Max Total Project Cost - TDC ex Land
    """
    nrv = net_realisation_value if net_realisation_value is not None else Decimal("0.00")
    tdc_ex_land = total_development_cost_ex_land if total_development_cost_ex_land is not None else Decimal("0.00")
    grv = gross_realisation_value if gross_realisation_value is not None else nrv
    duty_rate = (estimated_stamp_duty_rate_pct / Decimal("100.0")) if estimated_stamp_duty_rate_pct else Decimal("0.055")
    fixed_acq = estimated_acquisition_cost_fixed if estimated_acquisition_cost_fixed is not None else Decimal("0.00")

    # --- 1. Sizing via Target Margin on Cost ---
    m_cost_ratio = (target_margin_on_cost_pct / Decimal("100.0")) if target_margin_on_cost_pct else Decimal("0.20")
    max_tpc_for_cost_target = nrv / (Decimal("1.0") + m_cost_ratio) if (Decimal("1.0") + m_cost_ratio) > 0 else Decimal("0.00")
    max_land_acq_cost_target = max(Decimal("0.00"), max_tpc_for_cost_target - tdc_ex_land)
    
    # Solve for raw purchase price: PurchasePrice * (1 + duty_rate) + fixed_acq = max_land_acq
    raw_rlv_cost = max(Decimal("0.00"), (max_land_acq_cost_target - fixed_acq) / (Decimal("1.0") + duty_rate))

    # --- 2. Sizing via Target Margin on GRV ---
    m_grv_ratio = (target_margin_on_grv_pct / Decimal("100.0")) if target_margin_on_grv_pct else Decimal("0.15")
    target_profit_grv = grv * m_grv_ratio
    max_tpc_for_grv_target = max(Decimal("0.00"), nrv - target_profit_grv)
    max_land_acq_grv_target = max(Decimal("0.00"), max_tpc_for_grv_target - tdc_ex_land)
    raw_rlv_grv = max(Decimal("0.00"), (max_land_acq_grv_target - fixed_acq) / (Decimal("1.0") + duty_rate))

    # Sensitivity matrix for RLV across margins (15%, 18%, 20%, 22%, 25%)
    margin_sensitivity = []
    for test_margin in [15.0, 17.5, 20.0, 22.5, 25.0]:
        t_ratio = Decimal(str(test_margin)) / Decimal("100.0")
        t_tpc = nrv / (Decimal("1.0") + t_ratio)
        t_acq = max(Decimal("0.00"), t_tpc - tdc_ex_land)
        t_price = max(Decimal("0.00"), (t_acq - fixed_acq) / (Decimal("1.0") + duty_rate))
        margin_sensitivity.append({
            "target_margin_pct": test_margin,
            "max_land_purchase_price": round(t_price, 2),
            "max_total_land_acquisition": round(t_acq, 2),
        })

    return {
        "residual_land_value_cost_target": round(raw_rlv_cost, 2),
        "max_land_acquisition_cost_target": round(max_land_acq_cost_target, 2),
        "target_margin_on_cost_pct": target_margin_on_cost_pct,
        "residual_land_value_grv_target": round(raw_rlv_grv, 2),
        "max_land_acquisition_grv_target": round(max_land_acq_grv_target, 2),
        "target_margin_on_grv_pct": target_margin_on_grv_pct or (m_grv_ratio * Decimal("100.0")),
        "margin_sensitivity": margin_sensitivity
    }
