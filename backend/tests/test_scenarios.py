from fastapi import status

def test_create_and_list_scenarios(client, auth_headers):
    # Create project
    create_proj = client.post("/api/v1/projects", json={
        "name": "Suburban Masterplan",
        "development_type": "residential_subdivision"
    }, headers=auth_headers)
    project_id = create_proj.json()["id"]

    # Create additional scenario
    create_scen = client.post(f"/api/v1/projects/{project_id}/scenarios", json={
        "name": "Stage 1 Fast-Track",
        "description": "Accelerated civil construction timeline",
        "is_baseline": False,
        "status": "draft"
    }, headers=auth_headers)
    assert create_scen.status_code == status.HTTP_201_CREATED
    assert create_scen.json()["name"] == "Stage 1 Fast-Track"

    # List scenarios
    list_scen = client.get(f"/api/v1/projects/{project_id}/scenarios", headers=auth_headers)
    assert list_scen.status_code == status.HTTP_200_OK
    scenarios = list_scen.json()
    assert len(scenarios) == 2  # default baseline + newly added

def test_set_new_baseline_scenario(client, auth_headers):
    create_proj = client.post("/api/v1/projects", json={
        "name": "Tower One",
        "development_type": "multi_unit_residential",
        "initial_scenario_name": "Scenario A"
    }, headers=auth_headers)
    project_id = create_proj.json()["id"]

    # Create new scenario with is_baseline=True
    create_scen = client.post(f"/api/v1/projects/{project_id}/scenarios", json={
        "name": "Scenario B (Revised Yield)",
        "is_baseline": True,
        "status": "active"
    }, headers=auth_headers)
    assert create_scen.status_code == status.HTTP_201_CREATED
    new_scen_id = create_scen.json()["id"]

    # Check scenarios list: Scenario B should be baseline, Scenario A should not
    list_scen = client.get(f"/api/v1/projects/{project_id}/scenarios", headers=auth_headers).json()
    for s in list_scen:
        if s["id"] == new_scen_id:
            assert s["is_baseline"] is True
        else:
            assert s["is_baseline"] is False
