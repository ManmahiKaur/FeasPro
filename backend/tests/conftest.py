import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.core.config import settings
from backend.app.core.database import get_db, Base
from backend.app.core.security import get_password_hash, create_access_token
from backend.app.main import app
from backend.app.models.organization import Organization
from backend.app.models.user import User

# In-memory SQLite database for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_org(db_session):
    org = Organization(name="Primary Developer Group", slug="primary-dev", is_active=True)
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org

@pytest.fixture(scope="function")
def other_org(db_session):
    org = Organization(name="Competitor Real Estate", slug="competitor-org", is_active=True)
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org

@pytest.fixture(scope="function")
def test_user(db_session, test_org):
    user = User(
        email="test_user@primarydev.com",
        hashed_password=get_password_hash("TestPassword123!"),
        full_name="Jane Doe",
        role="developer",
        organization_id=test_org.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def other_user(db_session, other_org):
    user = User(
        email="other_user@competitor.com",
        hashed_password=get_password_hash("TestPassword123!"),
        full_name="Bob Smith",
        role="developer",
        organization_id=other_org.id,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def auth_headers(test_user):
    token = create_access_token(data={"sub": test_user.id, "org_id": test_user.organization_id, "role": test_user.role})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture(scope="function")
def other_auth_headers(other_user):
    token = create_access_token(data={"sub": other_user.id, "org_id": other_user.organization_id, "role": other_user.role})
    return {"Authorization": f"Bearer {token}"}
