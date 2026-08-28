from decimal import Decimal
import pytest
from backend.app.calculations import (
    calculate_stamp_duty,
    calculate_gst_margin_scheme,
    calculate_residual_land_value,
    calculate_npv_from_cashflows,
    calculate_wacc,
    calculate_development_costs,
    calculate_gross_revenue,
    calculate_funding_capital_stack,
    generate_cash_flow_schedule,
    FeasibilityCoreEngine,
)

def test_stamp_duty_calculation():
    # NSW property at $2,000,000
    res_nsw = calculate_stamp_duty(Decimal("2000000.00"), state="NSW")
    assert res_nsw["total_stamp_duty"] > Decimal("0.00")
    assert res_nsw["effective_rate_pct"] > Decimal("4.00")

    # QLD property at $1,500,000
    res_qld = calculate_stamp_duty(Decimal("1500000.00"), state="QLD")
    assert res_qld["total_stamp_duty"] > Decimal("0.00")

    # Foreign buyer surcharge in QLD
    res_foreign = calculate_stamp_duty(Decimal("1000000.00"), state="QLD", is_foreign_purchaser=True)
    assert res_foreign["foreign_surcharge"] == Decimal("80000.00")

def test_gst_margin_scheme():
    sale_price = Decimal("1100000.00")
    land_cost = Decimal("550000.00")

    # Margin scheme GST = (1,100,000 - 550,000) / 11 = 50,000
    res_margin = calculate_gst_margin_scheme(sale_price, land_cost, use_margin_scheme=True)
    assert res_margin["gst_payable"] == Decimal("50000.00")
    assert res_margin["net_revenue_ex_gst"] == Decimal("1050000.00")

    # Standard GST = 1,100,000 / 11 = 100,000
    res_std = calculate_gst_margin_scheme(sale_price, land_cost, use_margin_scheme=False)
    assert res_std["gst_payable"] == Decimal("100000.00")

def test_residual_land_value():
    nrv = Decimal("12000000.00")
    tdc_ex_land = Decimal("6000000.00")

    # At 20% margin on cost:
    # Max TPC = 12M / 1.20 = 10M
    # Max Land Acq = 10M - 6M = 4M
    # RLV = 4M / (1 + 0.055) = ~3,791,469.19
    rlv_res = calculate_residual_land_value(
        net_realisation_value=nrv,
        total_development_cost_ex_land=tdc_ex_land,
        target_margin_on_cost_pct=Decimal("20.00"),
        estimated_stamp_duty_rate_pct=Decimal("5.50")
    )
    assert rlv_res["max_land_acquisition_cost_target"] == Decimal("4000000.00")
    assert rlv_res["residual_land_value_cost_target"] > Decimal("3700000.00")
    assert len(rlv_res["margin_sensitivity"]) == 5

def test_npv_and_wacc():
    cfs = [-1000000.0, -200000.0, -300000.0, 500000.0, 1500000.0]
    npv = calculate_npv_from_cashflows(cfs, annual_discount_rate_pct=10.0)
    assert isinstance(npv, float)

    wacc = calculate_wacc(
        debt_amount=Decimal("7000000.00"),
        equity_amount=Decimal("3000000.00"),
        cost_of_debt_pct=Decimal("8.00"),
        cost_of_equity_pct=Decimal("18.00"),
        tax_rate_pct=Decimal("30.00")
    )
    assert wacc > Decimal("0.00")
    assert wacc < Decimal("18.00")

def test_feasibility_core_engine_pipeline():
    res = FeasibilityCoreEngine.run_full_feasibility(
        land_purchase_price=Decimal("3000000.00"),
        land_deposit_amount=Decimal("300000.00"),
        state="QLD",
        cost_items=[
            {"category": "construction", "calculation_method": "fixed_amount", "amount": 5000000.00, "phasing_curve": "s_curve", "start_month": 3, "end_month": 15},
            {"category": "consultants", "calculation_method": "fixed_amount", "amount": 500000.00, "phasing_curve": "linear", "start_month": 1, "end_month": 6},
        ],
        sales_items=[
            {"name": "3-Bed Townhouse", "total_units": 15, "avg_internal_area": 140, "unit_sale_price": 850000.00, "sales_commission_pct": 2.5, "marketing_cost_pct": 1.5, "sales_start_month": 4, "sales_end_month": 12, "settlement_month": 16}
        ],
        senior_debt_enabled=True,
        senior_max_ltc_pct=Decimal("70.00"),
        senior_max_lvr_pct=Decimal("65.00"),
        project_duration_months=16
    )

    assert "land" in res
    assert "stamp_duty" in res
    assert "costs" in res
    assert "sales" in res
    assert "gst" in res
    assert "funding" in res
    assert "cashflow" in res
    assert "valuation_rlv" in res
    assert "metrics" in res
    assert res["metrics"]["net_profit"] > Decimal("0.00")
    assert res["metrics"]["project_irr_pct"] > 0.0
