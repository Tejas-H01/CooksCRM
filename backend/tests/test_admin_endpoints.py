import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from app.db.database import Base
from app.models.models import User, Team, Customer, Lead, Event, Action, AuditLog
from app.services.auth_service import AuthService
from app.main import app
from app.db.database import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        # Create Teams
        team1 = Team(id=1, name="Team A")
        session.add(team1)
        session.commit()

        # Create Admin
        admin = User(id=1, username="admin", email="admin@crm.com", hashed_password=AuthService.hash_password("adminpass"), role="ADMIN", is_active=True)
        # Create RM
        rm = User(id=2, username="rm_alice", email="alice@crm.com", hashed_password=AuthService.hash_password("alicepass"), role="RM", team_id=1, is_active=True)
        session.add_all([admin, rm])
        session.commit()

        # Create Lead
        lead = Lead(id=1, name="Lead 1", potential_value=Decimal("100.00"), status="OPEN")
        session.add(lead)
        session.commit()

        # Create failed and processed events
        e1 = Event(id="ev_failed", event_type="NEW_LEAD", entity_type="lead", entity_id="1", payload={}, idempotency_key="key1", status="FAILED", error_message="Something failed", retry_count=0)
        e2 = Event(id="ev_processed", event_type="NEW_LEAD", entity_type="lead", entity_id="1", payload={}, idempotency_key="key2", status="PROCESSED", retry_count=0)
        session.add_all([e1, e2])
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

def test_admin_overview(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/admin/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_users"] == 2
    assert data["total_leads"] == 1
    assert data["events"]["processed"] == 1
    assert data["events"]["failed"] == 1
    assert data["events"]["processing_health_percentage"] == 50.0

def test_admin_overview_denied_for_rm(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "rm_alice", "password": "alicepass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/admin/overview", headers=headers)
    assert res.status_code == 403

def test_failed_events_list(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/admin/events/failed", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["id"] == "ev_failed"
    assert data[0]["error_message"] == "Something failed"

def test_event_retry(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/v1/admin/events/ev_failed/retry", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "retrying"
    assert data["retry_count"] == 1

def test_event_retry_validation_rules(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Retrying a non-failed event should fail
    res = client.post("/api/v1/admin/events/ev_processed/retry", headers=headers)
    assert res.status_code == 400
    assert "Only events in FAILED status" in res.json()["detail"]

    # Retrying a non-existent event should return 404
    res2 = client.post("/api/v1/admin/events/non_existent_event/retry", headers=headers)
    assert res2.status_code == 404

def test_audit_logs_recorded_on_admin_actions(client, db_session):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create team (triggers audit)
    team_res = client.post("/api/v1/admin/teams", json={"name": "Audit Team"}, headers=headers)
    assert team_res.status_code == 200

    # Query audit logs
    audit_res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    assert len(logs) > 0
    assert any(log["action"] == "TEAM_CREATED" for log in logs)

def test_roles_and_permissions(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    roles_res = client.get("/api/v1/admin/roles", headers=headers)
    assert roles_res.status_code == 200
    assert "BRANCH_MANAGER" in roles_res.json()
    assert "TEAM_LEAD" not in roles_res.json()

    perms_res = client.get("/api/v1/admin/permissions", headers=headers)
    assert perms_res.status_code == 200
    assert "RM" in perms_res.json()

def test_admin_user_crud_operations(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create User
    payload = {
        "username": "new_manager",
        "email": "new_manager@crm.com",
        "password": "managerpassword",
        "role": "BRANCH_MANAGER",
        "team_id": 1
    }
    res = client.post("/api/v1/admin/users", json=payload, headers=headers)
    assert res.status_code == 200
    new_user = res.json()
    assert new_user["username"] == "new_manager"
    assert new_user["role"] == "BRANCH_MANAGER"
    assert new_user["team_id"] == 1

    # 2. Update User (PATCH)
    update_payload = {
        "username": "updated_manager",
        "is_active": False
    }
    res_patch = client.patch(f"/api/v1/admin/users/{new_user['id']}", json=update_payload, headers=headers)
    assert res_patch.status_code == 200
    updated_user = res_patch.json()
    assert updated_user["username"] == "updated_manager"
    assert updated_user["is_active"] is False

    # 3. Update User Role
    res_role = client.patch(f"/api/v1/admin/users/{new_user['id']}/role", json={"role": "REGIONAL_HEAD"}, headers=headers)
    assert res_role.status_code == 200
    role_user = res_role.json()
    assert role_user["role"] == "REGIONAL_HEAD"

    # 4. Non-admin create user should be blocked
    rm_login = client.post("/api/v1/auth/login", json={"username": "rm_alice", "password": "alicepass"})
    rm_token = rm_login.json()["access_token"]
    rm_headers = {"Authorization": f"Bearer {rm_token}"}
    res_blocked = client.post("/api/v1/admin/users", json=payload, headers=rm_headers)
    assert res_blocked.status_code == 403

def test_admin_team_crud_operations(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Team
    res = client.post("/api/v1/admin/teams", json={"name": "New Team C", "manager_id": 2}, headers=headers)
    assert res.status_code == 200
    team = res.json()
    assert team["name"] == "New Team C"
    assert team["manager_id"] == 2

    # 2. Update Team
    res_patch = client.patch(f"/api/v1/admin/teams/{team['id']}", json={"name": "Updated Team C"}, headers=headers)
    assert res_patch.status_code == 200
    assert res_patch.json()["name"] == "Updated Team C"

