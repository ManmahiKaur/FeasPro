from decimal import Decimal
from fastapi.testclient import TestClient
from backend.app.calculations.funding import calculate_funding_capital_stack, calculate_distribution_waterfall

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


# ─── Waterfall Engine Tests ───────────────────────────────────────────────────

def test_waterfall_healthy_profit():
    """With healthy profit, waterfall distributes in exact tier order."""
    tranches = [
        {"id": "1", "tranche_type": "senior_debt", "name": "Senior Debt", "priority_order": 1, "amount": "5000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
        {"id": "2", "tranche_type": "preferred_equity", "name": "Preferred Equity", "priority_order": 2, "amount": "2000000", "hurdle_rate_pct": "15", "investor_split_pct": "80", "developer_promote_pct": "20"},
        {"id": "3", "tranche_type": "ordinary_equity", "name": "Ordinary Equity", "priority_order": 3, "amount": "1000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
    ]
    proceeds = Decimal("9000000.00")  # Plenty to cover all tiers
    result = calculate_distribution_waterfall(available_net_proceeds=proceeds, tranches=tranches, project_duration_months=24)

    # Tier 1: All capital returned (5M + 2M + 1M = 8M)
    tier1_total = sum(Decimal(str(i["capital_returned"])) for i in result["tier1_return_of_capital"])
    assert tier1_total == Decimal("8000000.00")

    # Tier 2: Preferred return = 2M * 15% * (24/12) = 600,000
    assert len(result["tier2_preferred_return"]) == 1
    assert result["tier2_preferred_return"][0]["preferred_return_paid"] == Decimal("600000.00")

    # Tier 3: Residual = 9M - 8M - 0.6M = 0.4M split 80/20
    tier3 = result["tier3_residual_split"][0]
    assert tier3["investor_distribution"] + tier3["developer_promote_distribution"] == Decimal("400000.00")

    # Reconciliation: difference must be EXACTLY 0
    assert result["reconciliation_difference"] == Decimal("0.00")
    assert result["total_distributed"] == proceeds


def test_waterfall_zero_profit():
    """With zero proceeds, no money should be distributed."""
    tranches = [
        {"id": "1", "tranche_type": "senior_debt", "name": "Senior Debt", "priority_order": 1, "amount": "5000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
        {"id": "2", "tranche_type": "ordinary_equity", "name": "Equity", "priority_order": 2, "amount": "1000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
    ]
    result = calculate_distribution_waterfall(available_net_proceeds=Decimal("0.00"), tranches=tranches)
    assert result["total_distributed"] == Decimal("0.00")
    assert result["reconciliation_difference"] == Decimal("0.00")
    for item in result["tier1_return_of_capital"]:
        assert Decimal(str(item["capital_returned"])) == Decimal("0.00")


def test_waterfall_negative_profit():
    """With negative proceeds, engine distributes zero and never creates money."""
    tranches = [
        {"id": "1", "tranche_type": "senior_debt", "name": "Senior Debt", "priority_order": 1, "amount": "5000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
    ]
    result = calculate_distribution_waterfall(available_net_proceeds=Decimal("-500000.00"), tranches=tranches)
    # No money distributed
    assert result["total_distributed"] == Decimal("0.00")
    # remaining_proceeds = max(0, remaining) = 0
    assert result["remaining_proceeds"] == Decimal("0.00")
    # Tier 1 capital returned must be 0
    for item in result["tier1_return_of_capital"]:
        assert Decimal(str(item["capital_returned"])) == Decimal("0.00")


def test_waterfall_insufficient_for_preferred_return():
    """If insufficient proceeds remain after capital return, preferred return is capped."""
    tranches = [
        {"id": "1", "tranche_type": "senior_debt", "name": "Senior Debt", "priority_order": 1, "amount": "5000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
        {"id": "2", "tranche_type": "preferred_equity", "name": "Pref Equity", "priority_order": 2, "amount": "2000000", "hurdle_rate_pct": "15", "investor_split_pct": "80", "developer_promote_pct": "20"},
    ]
    # Total capital = 7M. Proceeds = 7.1M. Only 100K left for preferred return.
    # Preferred return target = 2M * 15% * 2 years = 600K
    # Only 100K available after capital return (7.1M - 7M = 100K)
    proceeds = Decimal("7100000.00")
    result = calculate_distribution_waterfall(available_net_proceeds=proceeds, tranches=tranches, project_duration_months=24)

    pref = result["tier2_preferred_return"][0]
    assert Decimal(str(pref["preferred_return_paid"])) == Decimal("100000.00")
    assert Decimal(str(pref["shortfall"])) == Decimal("500000.00")
    # Total distributed = all proceeds
    assert result["total_distributed"] == proceeds
    assert result["reconciliation_difference"] == Decimal("0.00")


def test_waterfall_tranche_api(client: TestClient, auth_headers: dict):
    """Test tranche CRUD and waterfall endpoint via API."""
    proj_res = client.post("/api/v1/projects", json={"name": "Waterfall Test Project", "development_type": "townhouses"}, headers=auth_headers)
    assert proj_res.status_code == 201
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # List empty tranches
    t_res = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/funding/tranches", headers=auth_headers)
    assert t_res.status_code == 200
    assert t_res.json() == []

    # Create a senior debt tranche
    create_res = client.post(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/funding/tranches",
        json={"tranche_type": "senior_debt", "name": "Senior Debt", "priority_order": 1, "amount": "5000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
        headers=auth_headers)
    assert create_res.status_code == 201
    tranche_id = create_res.json()["id"]
    assert create_res.json()["tranche_type"] == "senior_debt"

    # Update tranche amount
    upd_res = client.put(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/funding/tranches/{tranche_id}",
        json={"tranche_type": "senior_debt", "name": "Senior Debt", "priority_order": 1, "amount": "6000000", "hurdle_rate_pct": "0", "investor_split_pct": "80", "developer_promote_pct": "20"},
        headers=auth_headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["amount"] == "6000000.00"

    # Waterfall endpoint
    wf_res = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/funding/waterfall", headers=auth_headers)
    assert wf_res.status_code == 200
    wf = wf_res.json()
    assert "waterfall" in wf
    assert "tier1_return_of_capital" in wf["waterfall"]
    assert Decimal(wf["waterfall"]["reconciliation_difference"]) == Decimal("0.00")

    # Delete tranche
    del_res = client.delete(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/funding/tranches/{tranche_id}", headers=auth_headers)
    assert del_res.status_code == 204
