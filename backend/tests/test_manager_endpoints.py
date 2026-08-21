import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.api.auth import get_current_user
from app.models.models import User, Team, Customer, Lead, Target, Action

# Setup isolated in-memory SQLite for tests so live PostgreSQL database is never wiped
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture
def setup_manager_data():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()

    app.dependency_overrides[get_db] = override_get_db

    try:
        # Create Teams
        team_a = Team(id=10, name="Branch Team Alpha")
        team_b = Team(id=20, name="Branch Team Beta")
        db_session.add_all([team_a, team_b])
        db_session.commit()

        # Create Branch Managers
        mgr_a = User(id=100, username="mgr_alpha", email="mgra@crm.com", hashed_password="pass", role="BRANCH_MANAGER", team_id=team_a.id, is_active=True)
        mgr_b = User(id=200, username="mgr_beta", email="mgrb@crm.com", hashed_password="pass", role="BRANCH_MANAGER", team_id=team_b.id, is_active=True)
        db_session.add_all([mgr_a, mgr_b])
        db_session.commit()

        team_a.manager_id = mgr_a.id
        team_b.manager_id = mgr_b.id
        db_session.commit()

        # Create RMs
        rm_a1 = User(id=101, username="rm_alpha_1", email="rma1@crm.com", hashed_password="pass", role="RM", team_id=team_a.id, parent_id=mgr_a.id, is_active=True)
        rm_b1 = User(id=201, username="rm_beta_1", email="rmb1@crm.com", hashed_password="pass", role="RM", team_id=team_b.id, parent_id=mgr_b.id, is_active=True)
        db_session.add_all([rm_a1, rm_b1])
        db_session.commit()

        # Create Customer & Lead for Team A RM
        cust_a = Customer(id=1000, name="Alpha Customer", assigned_rm_id=rm_a1.id)
        db_session.add(cust_a)
        db_session.commit()

        lead_a = Lead(
            id=500,
            customer_id=cust_a.id,
            name="Alpha High Value Investment",
            potential_value=Decimal("500000.00"),
            actual_value=Decimal("100000.00"),
            probability=80,
            stage="QUALIFIED",
            status="OPEN",
            assigned_rm_id=rm_a1.id
        )
        # Target for RM A1
        target_a = Target(id=800, rm_id=rm_a1.id, product="Wealth", period="monthly", target_value=Decimal("1000000.00"), achieved_value=Decimal("200000.00"))
        
        # Create Customer & Lead for Team B RM
        cust_b = Customer(id=2000, name="Beta Customer", assigned_rm_id=rm_b1.id)
        db_session.add(cust_b)
        db_session.commit()

        lead_b = Lead(
            id=600,
            customer_id=cust_b.id,
            name="Beta Bond Purchase",
            potential_value=Decimal("250000.00"),
            actual_value=Decimal("0.00"),
            probability=60,
            stage="NEW",
            status="OPEN",
            assigned_rm_id=rm_b1.id
        )

        db_session.add_all([lead_a, lead_b, target_a])
        db_session.commit()

        yield {
            "mgr_a": mgr_a,
            "mgr_b": mgr_b,
            "rm_a1": rm_a1,
            "rm_b1": rm_b1,
            "lead_a": lead_a,
            "lead_b": lead_b
        }
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.pop(get_db, None)

def test_manager_access_own_team_leads(setup_manager_data):
    data = setup_manager_data
    mgr_a = data["mgr_a"]

    app.dependency_overrides[get_current_user] = lambda: mgr_a
    client = TestClient(app)

    res = client.get("/api/v1/manager/leads")
    assert res.status_code == 200
    leads = res.json()
    assert len(leads) == 1
    assert leads[0]["name"] == "Alpha High Value Investment"
    assert leads[0]["potential_value"] == 500000.0
    assert leads[0]["remaining_value"] == 400000.0
    assert leads[0]["rm_name"] == "rm_alpha_1"

    app.dependency_overrides.pop(get_current_user, None)

def test_manager_cannot_access_other_team_rm_detail(setup_manager_data):
    data = setup_manager_data
    mgr_a = data["mgr_a"]
    rm_b1 = data["rm_b1"]

    app.dependency_overrides[get_current_user] = lambda: mgr_a
    client = TestClient(app)

    # Manager A tries to drill down into Manager B's RM (rm_b1)
    res = client.get(f"/api/v1/manager/rms/{rm_b1.id}/detail")
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

    app.dependency_overrides.pop(get_current_user, None)

def test_manager_can_access_own_rm_detail(setup_manager_data):
    data = setup_manager_data
    mgr_a = data["mgr_a"]
    rm_a1 = data["rm_a1"]

    app.dependency_overrides[get_current_user] = lambda: mgr_a
    client = TestClient(app)

    res = client.get(f"/api/v1/manager/rms/{rm_a1.id}/detail")
    assert res.status_code == 200
    detail = res.json()
    assert detail["rm_id"] == rm_a1.id
    assert detail["rm_name"] == "rm_alpha_1"
    assert len(detail["leads"]) == 1
    assert detail["leads"][0]["name"] == "Alpha High Value Investment"

    app.dependency_overrides.pop(get_current_user, None)
