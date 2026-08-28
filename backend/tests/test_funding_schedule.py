from decimal import Decimal
from fastapi.testclient import TestClient
from backend.app.calculations.funding import calculate_funding_capital_stack

def test_calculate_funding_capital_stack():
    total_cost = Decimal("10000000.00")
    grv = Decimal("14000000.00")

    res = calculate_funding_capital_stack(
        total_project_cost=total_cost,
        gross_realisation_value=grv,
        senior_debt_enabled=True,
        senior_max_ltc_pct=Decimal("70.00"),  # $7,000,000
        senior_max_lvr_pct=Decimal("60.00"),  # $8,400,000
        senior_interest_rate_pct=Decimal("8.00"),
        senior_line_fee_pct=Decimal("1.50"),
        senior_establishment_fee_pct=Decimal("1.00"),
        project_duration_months=24
    )

    assert res["senior_debt_facility_limit"] == Decimal("7000000.00")
    assert res["constraining_factor"] == "LTC (Cost)"
    assert res["required_developer_equity"] == Decimal("3000000.00")
    assert res["debt_percentage"] == Decimal("70.00")
    assert res["equity_percentage"] == Decimal("30.00")
    assert res["senior_establishment_fee"] == Decimal("70000.00")
    assert res["total_estimated_finance_cost"] > Decimal("0.00")

def test_funding_and_schedule_api(client: TestClient, auth_headers: dict):
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Skyline Funding & Schedule Test",
        "development_type": "townhouses"
    }, headers=auth_headers)
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # 2. Get Funding
    funding_res = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/funding", headers=auth_headers)
    assert funding_res.status_code == 200
    funding_data = funding_res.json()
    assert "assumption" in funding_data
    assert "summary" in funding_data
    assert funding_data["assumption"]["senior_max_ltc_pct"] == "70.00"

    # 3. Update Funding
    update_f_res = client.put(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/funding", json={
        "senior_debt_enabled": True,
        "senior_max_ltc_pct": "65.00",
        "senior_max_lvr_pct": "60.00",
        "senior_interest_rate_pct": "9.00",
        "senior_line_fee_pct": "1.50",
        "senior_establishment_fee_pct": "1.00",
        "mezzanine_enabled": False,
        "mezzanine_amount": "0.00",
        "mezzanine_interest_rate_pct": "15.00",
        "target_equity_contribution": "0.00"
    }, headers=auth_headers)
    assert update_f_res.status_code == 200
    assert update_f_res.json()["assumption"]["senior_max_ltc_pct"] == "65.00"

    # 4. Get Schedule
    sched_res = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/schedule", headers=auth_headers)
    assert sched_res.status_code == 200
    sched_data = sched_res.json()
    assert "milestones" in sched_data
    assert len(sched_data["milestones"]) >= 5
    assert sched_data["project_total_months"] >= 12

    # 5. Update Schedule Batch
    update_sched_res = client.put(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/schedule", json={
        "milestones": [
            {"stage": "acquisition", "name": "Settlement", "start_month": 1, "duration_months": 2, "end_month": 2, "status": "completed"},
            {"stage": "construction", "name": "Civil & Construction", "start_month": 3, "duration_months": 14, "end_month": 16, "status": "planned"},
        ]
    }, headers=auth_headers)
    assert update_sched_res.status_code == 200
    updated_sched = update_sched_res.json()
    assert len(updated_sched["milestones"]) == 2
    assert updated_sched["project_total_months"] == 16
