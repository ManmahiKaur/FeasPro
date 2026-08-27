import datetime
from fastapi import status

def test_create_project_success(client, auth_headers):
    payload = {
        "name": "Boutique Terrace Homes",
        "description": "8 luxury townhouses with private courtyard gardens.",
        "location": "88 Parkside Lane, Richmond VIC 3121",
        "development_type": "townhouses",
        "status": "active",
        "start_date": "2026-10-01",
        "target_completion_date": "2027-12-15",
        "initial_scenario_name": "Base Feasibility Scenario"
    }
    response = client.post("/api/v1/projects", json=payload, headers=auth_headers)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Boutique Terrace Homes"
    assert data["development_type"] == "townhouses"
    assert data["is_archived"] is False
    assert len(data["scenarios"]) == 1
    assert data["scenarios"][0]["name"] == "Base Feasibility Scenario"
    assert data["scenarios"][0]["is_baseline"] is True

def test_create_project_validation_errors(client, auth_headers):
    # Missing required name
    response = client.post("/api/v1/projects", json={
        "development_type": "industrial"
    }, headers=auth_headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Invalid dates: target_completion_date before start_date
    response = client.post("/api/v1/projects", json={
        "name": "Invalid Date Scheme",
        "start_date": "2027-01-01",
        "target_completion_date": "2026-01-01",
        "development_type": "residential_subdivision"
    }, headers=auth_headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Invalid development type
    response = client.post("/api/v1/projects", json={
        "name": "Invalid Type Scheme",
        "development_type": "spaceship_docking_station"
    }, headers=auth_headers)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_get_projects_list(client, auth_headers):
    # Create two projects
    client.post("/api/v1/projects", json={
        "name": "Project Alpha",
        "location": "Brisbane QLD",
        "development_type": "multi_unit_residential"
    }, headers=auth_headers)
    client.post("/api/v1/projects", json={
        "name": "Project Beta",
        "location": "Sydney NSW",
        "development_type": "commercial_mixed_use"
    }, headers=auth_headers)

    response = client.get("/api/v1/projects", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

    # Search filter
    search_res = client.get("/api/v1/projects?search=Alpha", headers=auth_headers)
    assert search_res.status_code == status.HTTP_200_OK
    assert search_res.json()["total"] == 1
    assert search_res.json()["items"][0]["name"] == "Project Alpha"

    # Type filter
    type_res = client.get("/api/v1/projects?development_type=commercial_mixed_use", headers=auth_headers)
    assert type_res.status_code == status.HTTP_200_OK
    assert type_res.json()["total"] == 1
    assert type_res.json()["items"][0]["name"] == "Project Beta"

def test_get_project_by_id(client, auth_headers):
    create_res = client.post("/api/v1/projects", json={
        "name": "Highland Estate",
        "location": "Perth WA",
        "development_type": "residential_subdivision"
    }, headers=auth_headers)
    project_id = create_res.json()["id"]

    get_res = client.get(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert get_res.status_code == status.HTTP_200_OK
    assert get_res.json()["id"] == project_id
    assert get_res.json()["name"] == "Highland Estate"

def test_update_project(client, auth_headers):
    create_res = client.post("/api/v1/projects", json={
        "name": "Initial Name",
        "location": "Adelaide SA",
        "development_type": "multi_unit_residential"
    }, headers=auth_headers)
    project_id = create_res.json()["id"]

    patch_res = client.patch(f"/api/v1/projects/{project_id}", json={
        "name": "Updated Landmark Heights",
        "description": "Expanded footprint with green building certification."
    }, headers=auth_headers)
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["name"] == "Updated Landmark Heights"
    assert patch_res.json()["description"] == "Expanded footprint with green building certification."

def test_archive_and_restore_project(client, auth_headers):
    create_res = client.post("/api/v1/projects", json={
        "name": "Project to Archive",
        "development_type": "industrial"
    }, headers=auth_headers)
    project_id = create_res.json()["id"]

    # Archive / soft-delete
    archive_res = client.delete(f"/api/v1/projects/{project_id}", headers=auth_headers)
    assert archive_res.status_code == status.HTTP_200_OK
    assert archive_res.json()["is_archived"] is True
    assert archive_res.json()["status"] == "archived"
    assert archive_res.json()["archived_at"] is not None

    # Excluded from active list by default
    list_res = client.get("/api/v1/projects", headers=auth_headers)
    assert list_res.json()["total"] == 0

    # Included when include_archived is requested
    list_archived_res = client.get("/api/v1/projects?include_archived=true", headers=auth_headers)
    assert list_archived_res.json()["total"] == 1

    # Restore project
    restore_res = client.post(f"/api/v1/projects/{project_id}/restore", headers=auth_headers)
    assert restore_res.status_code == status.HTTP_200_OK
    assert restore_res.json()["is_archived"] is False
    assert restore_res.json()["status"] == "active"
