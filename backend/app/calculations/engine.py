"""
FeasPro Core Calculation Engine Facade (Phase 1 Foundation).
Orchestrates the end-to-end deterministic property development feasibility evaluation.
"""

from decimal import Decimal
from typing import Dict, Any, List, Optional

from backend.app.calculations.taxation import calculate_stamp_duty, calculate_gst_margin_scheme
from backend.app.calculations.costs import calculate_land_acquisition_totals, calculate_development_costs
from backend.app.calculations.revenue import calculate_gross_revenue
from backend.app.calculations.funding import calculate_funding_capital_stack
from backend.app.calculations.cashflow import generate_cash_flow_schedule
from backend.app.calculations.valuation import calculate_residual_land_value
from backend.app.calculations.feasibility import (
    evaluate_feasibility_metrics,
    calculate_npv_from_cashflows,
    calculate_wacc,
)

class FeasibilityCoreEngine:
    """
    Master pure deterministic calculation pipeline for property development feasibility.
    """

    @staticmethod
    def run_full_feasibility(
        # Land
        land_purchase_price: Decimal,
        land_deposit_amount: Optional[Decimal] = None,
        land_acquisition_costs: Optional[List[Decimal]] = None,
        state: str = "QLD",
        is_foreign_purchaser: bool = False,
        # Costs
        cost_items: Optional[List[Dict[str, Any]]] = None,
        # Sales
        sales_items: Optional[List[Dict[str, Any]]] = None,
        use_gst_margin_scheme: bool = True,
        # Funding
        senior_debt_enabled: bool = True,
        senior_max_ltc_pct: Decimal = Decimal("70.00"),
        senior_max_lvr_pct: Decimal = Decimal("65.00"),
        senior_interest_rate_pct: Decimal = Decimal("8.50"),
        senior_line_fee_pct: Decimal = Decimal("1.50"),
        senior_establishment_fee_pct: Decimal = Decimal("1.00"),
        mezzanine_enabled: bool = False,
        mezzanine_amount: Decimal = Decimal("0.00"),
        mezzanine_interest_rate_pct: Decimal = Decimal("15.00"),
        # Schedule / Discounting
        project_duration_months: Optional[int] = None,
        discount_rate_pct: float = 10.0,
        target_margin_for_rlv_pct: Decimal = Decimal("20.00"),
    ) -> Dict[str, Any]:
        """
        Execute comprehensive feasibility modeling.
        """
        # 1. Land & Stamp Duty
        stamp_duty_info = calculate_stamp_duty(
            purchase_price=land_purchase_price,
            state=state,
            is_foreign_purchaser=is_foreign_purchaser
        )

        all_acq_costs = list(land_acquisition_costs) if land_acquisition_costs else []
        # If no custom stamp duty line provided, use calculated duty
        if not all_acq_costs:
            all_acq_costs.append(stamp_duty_info["total_stamp_duty"])

        land_res = calculate_land_acquisition_totals(
            purchase_price=land_purchase_price,
            deposit_amount=land_deposit_amount,
            cost_amounts=all_acq_costs
        )
        total_land_acq = land_res["total_land_acquisition"]

        # 2. Costs
        costs_input = cost_items if cost_items is not None else []
        cost_res = calculate_development_costs(
            cost_items=costs_input,
            land_acquisition_total=total_land_acq
        )
        total_project_cost = cost_res["total_project_cost"]
        tdc_ex_land = cost_res["total_development_cost_ex_land"]

        # 3. Revenue & Sales
        sales_input = sales_items if sales_items is not None else []
        sales_res = calculate_gross_revenue(sales_input)
        grv = sales_res["gross_realisation_value"]
        nrv = sales_res["net_realisation_value"]

        # 4. GST & Margin Scheme
        gst_res = calculate_gst_margin_scheme(
            gross_sale_price=grv,
            land_purchase_price=land_purchase_price,
            total_input_tax_credits=cost_res["total_input_tax_credits"],
            use_margin_scheme=use_gst_margin_scheme
        )

        # 5. Feasibility Base Returns
        net_profit_before_finance = nrv - total_project_cost

        # 6. Funding & Capital Stack
        funding_res = calculate_funding_capital_stack(
            total_project_cost=total_project_cost,
            gross_realisation_value=grv,
            senior_debt_enabled=senior_debt_enabled,
            senior_max_ltc_pct=senior_max_ltc_pct,
            senior_max_lvr_pct=senior_max_lvr_pct,
            senior_interest_rate_pct=senior_interest_rate_pct,
            senior_line_fee_pct=senior_line_fee_pct,
            senior_establishment_fee_pct=senior_establishment_fee_pct,
            mezzanine_enabled=mezzanine_enabled,
            mezzanine_amount=mezzanine_amount,
            mezzanine_interest_rate_pct=mezzanine_interest_rate_pct,
            project_duration_months=project_duration_months or 24,
            net_profit_before_finance=net_profit_before_finance
        )

        # 7. Cash Flow Schedule & S-Curves
        cf_res = generate_cash_flow_schedule(
            land_purchase_price=float(land_purchase_price),
            land_acquisition_costs=float(land_res["total_acquisition_costs"]),
            cost_items=cost_res["items"],
            sales_items=sales_res["items"],
            project_duration_months=project_duration_months
        )

        monthly_net_cfs = [m["net_cashflow"] for m in cf_res["monthly_data"]]
        project_npv = calculate_npv_from_cashflows(monthly_net_cfs, discount_rate_pct)

        # 8. WACC
        wacc = calculate_wacc(
            debt_amount=funding_res["total_debt_facility"],
            equity_amount=funding_res["required_developer_equity"],
            cost_of_debt_pct=senior_interest_rate_pct,
            cost_of_equity_pct=Decimal("18.00")
        )

        # 9. Residual Land Value (RLV)
        rlv_res = calculate_residual_land_value(
            net_realisation_value=nrv,
            total_development_cost_ex_land=tdc_ex_land,
            target_margin_on_cost_pct=target_margin_for_rlv_pct,
            gross_realisation_value=grv,
            estimated_stamp_duty_rate_pct=stamp_duty_info["effective_rate_pct"]
        )

        # 10. Summary Metrics
        metrics = evaluate_feasibility_metrics(
            gross_realisation_value=grv,
            net_realisation_value=nrv,
            total_project_cost=total_project_cost,
            total_development_cost_ex_land=tdc_ex_land,
            land_acquisition_total=total_land_acq,
            required_equity=funding_res["required_developer_equity"],
            total_finance_cost=funding_res["total_estimated_finance_cost"],
            monthly_cashflows=monthly_net_cfs,
            discount_rate_pct=discount_rate_pct
        )

        return {
            "land": land_res,
            "stamp_duty": stamp_duty_info,
            "costs": cost_res,
            "sales": sales_res,
            "gst": gst_res,
            "funding": funding_res,
            "cashflow": cf_res,
            "valuation_rlv": rlv_res,
            "wacc_pct": wacc,
            "metrics": metrics,
        }
