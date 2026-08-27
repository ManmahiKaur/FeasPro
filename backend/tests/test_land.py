from decimal import Decimal
from fastapi import status

def test_get_and_auto_initialize_land(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Boutique Coastal Project",
        "development_type": "multi_unit_residential"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # 2. Get land data -> should auto-initialize template with default categories
    land_res = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land", headers=auth_headers)
    assert land_res.status_code == status.HTTP_200_OK
    data = land_res.json()
    assert data["scenario_id"] == scenario_id
    assert Decimal(str(data["purchase_price"])) == Decimal("0.00")
    assert len(data["acquisition_costs"]) >= 5
    assert Decimal(str(data["calculations"]["total_land_acquisition"])) == Decimal("0.00")

def test_update_land_purchase_and_calculations(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Highland Terraces",
        "development_type": "townhouses"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # 2. Update land purchase, timing, site information and cost items
    update_payload = {
        "purchase_price": "2500000.00",
        "deposit_amount": "250000.00",
        "contract_date": "2026-10-01",
        "deposit_due_date": "2026-10-15",
        "settlement_date": "2026-12-15",
        "site_area": "1250.50",
        "site_area_unit": "m²",
        "current_zoning": "R3 Medium Density",
        "planning_notes": "Permissible 3-storey building height.",
        "acquisition_costs": [
            {
                "category": "stamp_duty",
                "name": "Stamp / Transfer Duty",
                "amount": "137500.00",
                "notes": "State transfer duty"
            },
            {
                "category": "legal_fees",
                "name": "Legal Conveyancing",
                "amount": "12500.00"
            },
            {
                "category": "due_diligence",
                "name": "Soil & Geotechnical Reports",
                "amount": "18000.00"
            }
        ]
    }

    put_res = client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        json=update_payload,
        headers=auth_headers
    )
    assert put_res.status_code == status.HTTP_200_OK
    data = put_res.json()

    assert Decimal(str(data["purchase_price"])) == Decimal("2500000.00")
    assert Decimal(str(data["deposit_amount"])) == Decimal("250000.00")
    assert Decimal(str(data["site_area"])) == Decimal("1250.50")
    assert len(data["acquisition_costs"]) == 3

    # Verify Calculations
    calcs = data["calculations"]
    # Total acquisition costs = 137,500 + 12,500 + 18,000 = 168,000
    assert Decimal(str(calcs["total_acquisition_costs"])) == Decimal("168000.00")
    # Total land acquisition = 2,500,000 + 168,000 = 2,668,000
    assert Decimal(str(calcs["total_land_acquisition"])) == Decimal("2668000.00")
    # Remaining purchase amount = 2,500,000 - 250,000 = 2,250,000
    assert Decimal(str(calcs["remaining_purchase_amount"])) == Decimal("2250000.00")

def test_cost_items_crud(client, auth_headers):
    # 1. Create project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Cost Item Test Project",
        "development_type": "residential_subdivision"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # 2. Add an acquisition cost item
    add_cost_res = client.post(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land/costs",
        json={
            "category": "valuation_fees",
            "name": "Bank Feasibility Valuation",
            "amount": "9500.00",
            "notes": "Lender required valuation"
        },
        headers=auth_headers
    )
    assert add_cost_res.status_code == status.HTTP_201_CREATED
    cost_id = add_cost_res.json()["id"]
    assert Decimal(str(add_cost_res.json()["amount"])) == Decimal("9500.00")

    # 3. Update cost item
    update_cost_res = client.patch(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land/costs/{cost_id}",
        json={
            "amount": "11000.00",
            "notes": "Updated valuation quote"
        },
        headers=auth_headers
    )
    assert update_cost_res.status_code == status.HTTP_200_OK
    assert Decimal(str(update_cost_res.json()["amount"])) == Decimal("11000.00")

    # 4. Delete cost item
    del_res = client.delete(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land/costs/{cost_id}",
        headers=auth_headers
    )
    assert del_res.status_code == status.HTTP_204_NO_CONTENT

def test_land_validation_errors(client, auth_headers):
    proj_res = client.post("/api/v1/projects", json={
        "name": "Validation Scheme",
        "development_type": "multi_unit_residential"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # Negative purchase price
    res1 = client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        json={"purchase_price": "-50000.00"},
        headers=auth_headers
    )
    assert res1.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Negative deposit amount
    res2 = client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        json={"deposit_amount": "-1000.00"},
        headers=auth_headers
    )
    assert res2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Negative cost amount
    res3 = client.post(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land/costs",
        json={"name": "Invalid Cost", "amount": "-500.00"},
        headers=auth_headers
    )
    assert res3.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Invalid dates: settlement before contract
    res4 = client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        json={
            "contract_date": "2027-01-01",
            "settlement_date": "2026-01-01"
        },
        headers=auth_headers
    )
    assert res4.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Invalid dates: deposit due date after settlement
    res5 = client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        json={
            "settlement_date": "2026-06-01",
            "deposit_due_date": "2026-07-01"
        },
        headers=auth_headers
    )
    assert res5.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_scenario_land_data_isolation(client, auth_headers):
    """Verify that multiple scenarios in the same project maintain completely isolated land assumptions."""
    # 1. Create project with baseline scenario
    proj_res = client.post("/api/v1/projects", json={
        "name": "Dual Scheme Tower",
        "development_type": "multi_unit_residential",
        "initial_scenario_name": "Scenario A - Low Density"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]
    scenario_a_id = proj_res.json()["scenarios"][0]["id"]

    # 2. Create second scenario
    scen_b_res = client.post(
        f"/api/v1/projects/{project_id}/scenarios",
        json={"name": "Scenario B - High Density"},
        headers=auth_headers
    )
    scenario_b_id = scen_b_res.json()["id"]

    # 3. Set Scenario A land purchase to $2,000,000
    client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_a_id}/land",
        json={"purchase_price": "2000000.00"},
        headers=auth_headers
    )

    # 4. Set Scenario B land purchase to $2,800,000
    client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_b_id}/land",
        json={"purchase_price": "2800000.00"},
        headers=auth_headers
    )

    # 5. Verify Scenario A is unchanged
    land_a = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_a_id}/land", headers=auth_headers).json()
    assert Decimal(str(land_a["purchase_price"])) == Decimal("2000000.00")

    # 6. Verify Scenario B is unchanged
    land_b = client.get(f"/api/v1/projects/{project_id}/scenarios/{scenario_b_id}/land", headers=auth_headers).json()
    assert Decimal(str(land_b["purchase_price"])) == Decimal("2800000.00")

def test_cross_tenant_land_isolation(client, auth_headers, other_auth_headers):
    """User in Org B cannot read or modify Org A's land data."""
    # Org A creates project & scenario
    proj_res = client.post("/api/v1/projects", json={
        "name": "Confidential Land Site",
        "development_type": "industrial"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    # Org B attempts to read Org A's land -> 404
    get_res = client.get(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        headers=other_auth_headers
    )
    assert get_res.status_code == status.HTTP_404_NOT_FOUND

    # Org B attempts to update Org A's land -> 404
    put_res = client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        json={"purchase_price": "9999999.00"},
        headers=other_auth_headers
    )
    assert put_res.status_code == status.HTTP_404_NOT_FOUND

def test_negative_site_area_rejection(client, auth_headers):
    proj_res = client.post("/api/v1/projects", json={
        "name": "Site Area Test",
        "development_type": "residential_subdivision"
    }, headers=auth_headers)
    project_id = proj_res.json()["id"]
    scenario_id = proj_res.json()["scenarios"][0]["id"]

    res = client.put(
        f"/api/v1/projects/{project_id}/scenarios/{scenario_id}/land",
        json={"site_area": "-500.00"},
        headers=auth_headers
    )
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_cross_project_scenario_tampering(client, auth_headers):
    """Scenario belonging to Project 2 cannot be accessed under Project 1 URL path."""
    proj1 = client.post("/api/v1/projects", json={"name": "Project 1", "development_type": "townhouses"}, headers=auth_headers).json()
    proj2 = client.post("/api/v1/projects", json={"name": "Project 2", "development_type": "townhouses"}, headers=auth_headers).json()

    p1_id = proj1["id"]
    p2_id = proj2["id"]
    p2_scen_id = proj2["scenarios"][0]["id"]

    # Access Project 2's scenario under Project 1 -> 404
    res = client.get(f"/api/v1/projects/{p1_id}/scenarios/{p2_scen_id}/land", headers=auth_headers)
    assert res.status_code == status.HTTP_404_NOT_FOUND

def test_calculation_engine_pure_functions():
    """Direct unit tests for Python Decimal arithmetic in calculations/costs.py."""
    from backend.app.calculations.costs import calculate_land_acquisition_totals

    # Normal case
    result = calculate_land_acquisition_totals(
        purchase_price=Decimal("2000000.00"),
        deposit_amount=Decimal("200000.00"),
        cost_amounts=[Decimal("100000.00"), Decimal("25000.50"), Decimal("15000.00")]
    )
    assert result["purchase_price"] == Decimal("2000000.00")
    assert result["deposit_amount"] == Decimal("200000.00")
    assert result["total_acquisition_costs"] == Decimal("140000.50")
    assert result["total_land_acquisition"] == Decimal("2140000.50")
    assert result["remaining_purchase_amount"] == Decimal("1800000.00")

    # None and empty checks
    result_defaults = calculate_land_acquisition_totals(
        purchase_price=Decimal("1500000.00"),
        deposit_amount=None,
        cost_amounts=None
    )
    assert result_defaults["total_acquisition_costs"] == Decimal("0.00")
    assert result_defaults["total_land_acquisition"] == Decimal("1500000.00")
    assert result_defaults["remaining_purchase_amount"] == Decimal("1500000.00")

    # Deposit greater than purchase price clamp
    result_overpaid = calculate_land_acquisition_totals(
        purchase_price=Decimal("1000000.00"),
        deposit_amount=Decimal("1200000.00"),
        cost_amounts=[]
    )
    assert result_overpaid["remaining_purchase_amount"] == Decimal("0.00")


