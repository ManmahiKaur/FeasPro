from decimal import Decimal
from fastapi.testclient import TestClient
from backend.app.calculations.costs import calculate_development_costs
from backend.app.calculations.revenue import calculate_gross_revenue
from backend.app.calculations.cashflow import generate_cash_flow_schedule, calculate_s_curve_weights

def test_s_curve_weights():
    weights = calculate_s_curve_weights(12)
    assert len(weights) == 12
    assert abs(sum(weights) - 1.0) < 1e-5
    # S-curve should start lower, peak in the middle, and taper at the end
    assert weights[5] > weights[0]
    assert weights[6] > weights[11]

def test_calculate_development_costs():
    cost_items = [
        {"category": "construction", "name": "Structure", "amount": 5000000.0, "calculation_method": "fixed_amount"},
        {"category": "consultants", "name": "Architect", "amount": 250000.0, "calculation_method": "fixed_amount"},
        {"category": "statutory", "name": "Levies", "amount": 100000.0, "calculation_method": "fixed_amount"},
    ]
    res = calculate_development_costs(cost_items, land_acquisition_total=Decimal("2000000.00"))
    assert res["construction_subtotal"] == Decimal("5000000.0")
    assert res["consultants_subtotal"] == Decimal("250000.0")
    assert res["total_development_cost_ex_land"] == Decimal("5350000.0")
    assert res["total_project_cost"] == Decimal("7350000.0")

def test_calculate_gross_revenue():
    sales_items = [
        {
            "total_units": 10,
            "avg_internal_area": 80.0,
            "unit_sale_price": 800000.0,
            "sales_commission_pct": 2.0,
            "marketing_cost_pct": 1.5,
        }
    ]
    res = calculate_gross_revenue(sales_items)
    assert res["total_units"] == 10
    assert res["gross_realisation_value"] == Decimal("8000000.0")
    assert res["total_selling_costs"] == Decimal("280000.0")
    assert res["net_realisation_value"] == Decimal("7720000.0")

def test_generate_cash_flow_schedule():
    cost_items = [
        {"category": "construction", "name": "Build", "amount": 4000000.0, "phasing_curve": "s_curve", "start_month": 3, "end_month": 14}
    ]
    sales_items = [
        {"name": "Units", "total_units": 10, "unit_sale_price": 600000.0, "total_revenue": 6000000.0, "sales_start_month": 2, "sales_end_month": 10, "settlement_month": 16}
    ]
    cf = generate_cash_flow_schedule(
        land_purchase_price=1000000.0,
        land_acquisition_costs=50000.0,
        cost_items=cost_items,
        sales_items=sales_items,
        project_duration_months=20
    )
    assert cf["project_duration_months"] == 20
    assert len(cf["monthly_data"]) == 20
    assert cf["total_revenue"] > 0
    assert cf["total_costs"] > 0
    assert cf["peak_debt"] > 0

def test_costs_sales_cashflow_api(client: TestClient, auth_headers: dict):
    # 1. Create a test project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Harbour Feasibility Project",
        "development_type": "multi_unit_residential"
    }, headers=auth_headers)
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # 2. Get Costs
    res_cost = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/costs", headers=auth_headers)
    assert res_cost.status_code == 200
    cost_data = res_cost.json()
    assert "summary" in cost_data
    assert "items" in cost_data
    assert len(cost_data["items"]) >= 1

    # 3. Get Sales
    res_sales = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/sales", headers=auth_headers)
    assert res_sales.status_code == 200
    sales_data = res_sales.json()
    assert "summary" in sales_data
    assert "items" in sales_data
    assert len(sales_data["items"]) >= 1

    # 4. Get Cash Flow
    res_cf = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/cashflow", headers=auth_headers)
    assert res_cf.status_code == 200
    cf_data = res_cf.json()
    assert "monthly_data" in cf_data
    assert len(cf_data["monthly_data"]) >= 18
    assert "project_irr" in cf_data
    assert "peak_debt" in cf_data
