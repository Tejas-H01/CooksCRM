import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.db.database import Base
from app.models.models import User, Team, Customer, Lead, Target, Action
from app.services.auth_service import AuthService
from app.main import app
from app.db.database import get_db

from sqlalchemy.pool import StaticPool
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
        team2 = Team(id=2, name="Team B")
        session.add_all([team1, team2])
        session.commit()

        # Create Regional Heads
        rh1 = User(id=1, username="regional1", email="rh1@crm.com", hashed_password=AuthService.hash_password("rh1pass"), role="REGIONAL_HEAD", is_active=True)
        rh2 = User(id=2, username="regional2", email="rh2@crm.com", hashed_password=AuthService.hash_password("rh2pass"), role="REGIONAL_HEAD", is_active=True)
        session.add_all([rh1, rh2])
        session.commit()

        # Create Branch Managers
        bm1 = User(id=3, username="manager1", email="bm1@crm.com", hashed_password=AuthService.hash_password("bm1pass"), role="BRANCH_MANAGER", team_id=1, parent_id=1, is_active=True)
        bm2 = User(id=4, username="manager2", email="bm2@crm.com", hashed_password=AuthService.hash_password("bm2pass"), role="BRANCH_MANAGER", team_id=2, parent_id=2, is_active=True)
        session.add_all([bm1, bm2])
        session.commit()

        team1.manager_id = 3
        team2.manager_id = 4
        session.commit()

        # Create RMs
        rm1 = User(id=5, username="rm_alice", email="alice@crm.com", hashed_password=AuthService.hash_password("alicepass"), role="RM", team_id=1, parent_id=3, is_active=True)
        rm2 = User(id=6, username="rm_bob", email="bob@crm.com", hashed_password=AuthService.hash_password("bobpass"), role="RM", team_id=1, parent_id=3, is_active=True)
        rm_inactive = User(id=7, username="rm_inactive", email="inactive@crm.com", hashed_password=AuthService.hash_password("inactpass"), role="RM", team_id=1, parent_id=3, is_active=False)
        session.add_all([rm1, rm2, rm_inactive])
        session.commit()

        # Create Admin
        admin = User(id=8, username="admin", email="admin@crm.com", hashed_password=AuthService.hash_password("adminpass"), role="ADMIN", is_active=True)
        session.add(admin)
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

def test_valid_login(client):
    res = client.post("/api/v1/auth/login", json={"username": "rm_alice", "password": "alicepass"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_invalid_password(client):
    res = client.post("/api/v1/auth/login", json={"username": "rm_alice", "password": "wrongpassword"})
    assert res.status_code == 401
    assert "Invalid username" in res.json()["detail"]

def test_unknown_user(client):
    res = client.post("/api/v1/auth/login", json={"username": "unknown_user", "password": "somepassword"})
    assert res.status_code == 401

def test_inactive_user(client):
    res = client.post("/api/v1/auth/login", json={"username": "rm_inactive", "password": "inactpass"})
    assert res.status_code == 400
    assert "Inactive user" in res.json()["detail"]

def test_jwt_validation_and_me(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "rm_alice", "password": "alicepass"})
    token = login_res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["username"] == "rm_alice"
    assert data["role"] == "RM"
    assert "hashed_password" not in data

def test_unauthorized_requests_return_401(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401

    res2 = client.get("/api/v1/rm/me", headers={"Authorization": "Bearer invalid_token_xyz"})
    assert res2.status_code == 401

def test_rm_me_endpoints(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "rm_alice", "password": "alicepass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/rm/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["username"] == "rm_alice"

def test_rm_cannot_access_manager_or_admin(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "rm_alice", "password": "alicepass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/manager/branch", headers=headers)
    assert res.status_code == 403

    res2 = client.get("/api/v1/admin/users", headers=headers)
    assert res2.status_code == 403

def test_branch_manager_endpoints(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "manager1", "password": "bm1pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/manager/branch", headers=headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Team A"

    res2 = client.get("/api/v1/manager/rms", headers=headers)
    assert res2.status_code == 200
    rms = res2.json()
    assert len(rms) == 3
    assert any(r["username"] == "rm_alice" for r in rms)

def test_branch_manager_cannot_access_other_branch(client, db_session):
    login_res = client.post("/api/v1/auth/login", json={"username": "manager1", "password": "bm1pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/manager/rms", headers=headers)
    rms = res.json()
    assert all(r["team_id"] == 1 for r in rms)
    assert not any(r["team_id"] == 2 for r in rms)

def test_regional_head_endpoints(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "regional1", "password": "rh1pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/regional/branches", headers=headers)
    assert res.status_code == 200
    branches = res.json()
    assert len(branches) == 1
    assert branches[0]["name"] == "Team A"

def test_admin_endpoints(client):
    login_res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "adminpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/admin/users", headers=headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 8
