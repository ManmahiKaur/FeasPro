from fastapi import status

def test_tenant_data_isolation(client, auth_headers, other_auth_headers):
    # User 1 (Org A) creates a project
    create_res = client.post("/api/v1/projects", json={
        "name": "Confidential Development Scheme",
        "development_type": "commercial_mixed_use"
    }, headers=auth_headers)
    assert create_res.status_code == status.HTTP_201_CREATED
    project_id = create_res.json()["id"]

    # User 2 (Org B) attempts to read Org A's project -> MUST return 404
    get_res = client.get(f"/api/v1/projects/{project_id}", headers=other_auth_headers)
    assert get_res.status_code == status.HTTP_404_NOT_FOUND

    # User 2 attempts to list projects -> Org A's project must NOT appear
    list_res = client.get("/api/v1/projects", headers=other_auth_headers)
    assert list_res.status_code == status.HTTP_200_OK
    assert list_res.json()["total"] == 0

    # User 2 attempts to add scenario to Org A's project -> MUST return 404
    scenario_res = client.post(f"/api/v1/projects/{project_id}/scenarios", json={
        "name": "Malicious Scenario Injection"
    }, headers=other_auth_headers)
    assert scenario_res.status_code == status.HTTP_404_NOT_FOUND

    # User 2 attempts to update Org A's project -> MUST return 404
    update_res = client.patch(f"/api/v1/projects/{project_id}", json={
        "name": "Hacked Name"
    }, headers=other_auth_headers)
    assert update_res.status_code == status.HTTP_404_NOT_FOUND

    # User 2 attempts to archive Org A's project -> MUST return 404
    archive_res = client.delete(f"/api/v1/projects/{project_id}", headers=other_auth_headers)
    assert archive_res.status_code == status.HTTP_404_NOT_FOUND

def test_login_and_me_endpoint(client, test_user):
    # Login with valid credentials
    login_res = client.post("/api/v1/auth/login/json", json={
        "email": "test_user@primarydev.com",
        "password": "TestPassword123!"
    })
    assert login_res.status_code == status.HTTP_200_OK
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Access /auth/me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == status.HTTP_200_OK
    assert me_res.json()["email"] == "test_user@primarydev.com"
    assert me_res.json()["full_name"] == "Jane Doe"

def test_login_invalid_credentials(client):
    login_res = client.post("/api/v1/auth/login/json", json={
        "email": "test_user@primarydev.com",
        "password": "WrongPassword123!"
    })
    assert login_res.status_code == status.HTTP_401_UNAUTHORIZED

def test_unauthenticated_requests_blocked(client):
    # No auth header supplied to protected endpoints
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == status.HTTP_401_UNAUTHORIZED

    projects_res = client.get("/api/v1/projects")
    assert projects_res.status_code == status.HTTP_401_UNAUTHORIZED

    create_res = client.post("/api/v1/projects", json={"name": "No Auth Project"})
    assert create_res.status_code == status.HTTP_401_UNAUTHORIZED

def test_invalid_token_rejected(client):
    headers = {"Authorization": "Bearer invalid_garbage_token"}
    res = client.get("/api/v1/projects", headers=headers)
    assert res.status_code == status.HTTP_401_UNAUTHORIZED

def test_register_success_and_auto_auth(client, db_session):
    payload = {
        "full_name": "Sarah Connor",
        "email": "sarah@cyberdyne-dev.com.au",
        "organization_name": "Cyberdyne Developments",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sarah@cyberdyne-dev.com.au"
    assert data["user"]["full_name"] == "Sarah Connor"
    assert data["user"]["role"] == "admin"
    org_id = data["user"]["organization_id"]
    assert org_id is not None

    # Check password is securely hashed in database, not stored plaintext
    from backend.app.models.user import User
    from backend.app.core.security import verify_password
    user_in_db = db_session.query(User).filter(User.email == "sarah@cyberdyne-dev.com.au").first()
    assert user_in_db is not None
    assert user_in_db.hashed_password != "SecurePassword123!"
    assert verify_password("SecurePassword123!", user_in_db.hashed_password) is True

    # Use returned token to access /auth/me
    token = data["access_token"]
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == status.HTTP_200_OK
    assert me_res.json()["organization_id"] == org_id

    # Verify newly registered user gets an empty portfolio (isolated)
    proj_res = client.get("/api/v1/projects", headers={"Authorization": f"Bearer {token}"})
    assert proj_res.status_code == status.HTTP_200_OK
    assert proj_res.json()["total"] == 0

def test_register_duplicate_email_blocked(client, test_user):
    payload = {
        "full_name": "Duplicate Person",
        "email": test_user.email,  # already exists in DB
        "organization_name": "Duplicate Org",
        "password": "AnotherPassword123!",
        "confirm_password": "AnotherPassword123!"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in res.json()["detail"]

def test_register_password_mismatch(client):
    payload = {
        "full_name": "Marcus Wright",
        "email": "marcus@skynet-property.com",
        "organization_name": "Skynet Property",
        "password": "FirstPassword123!",
        "confirm_password": "DifferentPassword123!"
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "do not match" in res.json()["detail"]

def test_register_validation_errors(client):
    # Invalid email format
    res = client.post("/api/v1/auth/register", json={
        "full_name": "John Doe",
        "email": "not-an-email",
        "organization_name": "Some Org",
        "password": "ValidPassword123!"
    })
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Password too short (<8 chars)
    res = client.post("/api/v1/auth/register", json={
        "full_name": "John Doe",
        "email": "john@valid.com",
        "organization_name": "Some Org",
        "password": "short"
    })
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Missing full name
    res = client.post("/api/v1/auth/register", json={
        "email": "john@valid.com",
        "organization_name": "Some Org",
        "password": "ValidPassword123!"
    })
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Missing organization name
    res = client.post("/api/v1/auth/register", json={
        "full_name": "John Doe",
        "email": "john@valid.com",
        "password": "ValidPassword123!"
    })
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

def test_login_with_registered_account(client):
    # 1. Register
    reg_payload = {
        "full_name": "Kyle Reese",
        "email": "kyle@resistance-realty.com",
        "organization_name": "Resistance Realty",
        "password": "MySecretPass2026!"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == status.HTTP_201_CREATED

    # 2. Log in using JSON credentials
    login_res = client.post("/api/v1/auth/login/json", json={
        "email": "kyle@resistance-realty.com",
        "password": "MySecretPass2026!"
    })
    assert login_res.status_code == status.HTTP_200_OK
    assert "access_token" in login_res.json()
    assert login_res.json()["user"]["full_name"] == "Kyle Reese"


