import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime

from app.main import app
from app.db.database import Base, get_db
from app.api.auth import get_current_user
from app.models.models import User, Customer, Lead, Event
from app.schemas.event import EventType

# Setup in-memory SQLite for isolated testing
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

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    app.dependency_overrides[get_db] = override_get_db

    # Seed RM Alice (id 1) and RM Bob (id 2)
    alice = User(id=1, username="alice", email="alice@example.com", hashed_password="pw", role="RM")
    bob = User(id=2, username="bob", email="bob@example.com", hashed_password="pw", role="RM")
    db.add_all([alice, bob])
    db.commit()

    # Seed Customers
    cust1 = Customer(id=1, name="John Doe", assigned_rm_id=1, segment="HNW")
    cust2 = Customer(id=2, name="Jane Smith", assigned_rm_id=2, segment="Retail")
    db.add_all([cust1, cust2])
    db.commit()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

def test_opportunity_suggestion_flow(setup_db):
    db = setup_db
    alice = db.query(User).filter(User.id == 1).first()

    # Add a SUGGESTED lead for Alice
    sugg_lead = Lead(
        id=10,
        customer_id=1,
        assigned_rm_id=1,
        name="John Doe - Mutual Funds",
        potential_value=150000.00,
        probability=50,
        stage="QUALIFIED",
        status="SUGGESTED",
        reason="High-intent product enquiry signal",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(sugg_lead)
    db.commit()

    app.dependency_overrides[get_current_user] = lambda: alice
    client = TestClient(app)

    # 1. Fetch suggestions
    res = client.get("/api/v1/rm/me/opportunity-suggestions")
    assert res.status_code == 200
    suggestions = res.json()
    assert len(suggestions) == 1
    assert suggestions[0]["id"] == 10
    assert suggestions[0]["status"] == "SUGGESTED"
    assert suggestions[0]["customer_name"] == "John Doe"

    # 2. Accept suggestion
    res_accept = client.post("/api/v1/rm/me/opportunity-suggestions/10/accept")
    assert res_accept.status_code == 200
    accepted = res_accept.json()
    assert accepted["status"] == "OPEN"

    # Verify OPPORTUNITY_CREATED event was emitted
    evt = db.query(Event).filter(Event.event_type == EventType.OPPORTUNITY_CREATED).first()
    assert evt is not None
    assert evt.entity_id == "10"

    app.dependency_overrides.pop(get_current_user)

def test_opportunity_suggestion_dismiss(setup_db):
    db = setup_db
    alice = db.query(User).filter(User.id == 1).first()

    sugg_lead = Lead(
        id=11,
        customer_id=1,
        assigned_rm_id=1,
        name="John Doe - Credit Card",
        potential_value=50000.00,
        probability=30,
        stage="QUALIFIED",
        status="SUGGESTED",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(sugg_lead)
    db.commit()

    app.dependency_overrides[get_current_user] = lambda: alice
    client = TestClient(app)

    res_dismiss = client.post("/api/v1/rm/me/opportunity-suggestions/11/dismiss")
    assert res_dismiss.status_code == 200
    dismissed = res_dismiss.json()
    assert dismissed["status"] == "DISMISSED"

    evt = db.query(Event).filter(Event.event_type == EventType.OPPORTUNITY_DISMISSED).first()
    assert evt is not None

    app.dependency_overrides.pop(get_current_user)

def test_manual_opportunity_creation_validations(setup_db):
    db = setup_db
    alice = db.query(User).filter(User.id == 1).first()
    bob = db.query(User).filter(User.id == 2).first()

    app.dependency_overrides[get_current_user] = lambda: alice
    client = TestClient(app)

    # Valid Creation
    valid_payload = {
        "customer_id": 1,
        "name": "Wealth Advisory Package",
        "potential_value": 250000.00,
        "probability": 60,
        "stage": "QUALIFIED",
        "notes": "Met customer at branch"
    }
    res = client.post("/api/v1/rm/me/opportunities", json=valid_payload)
    assert res.status_code == 201
    created = res.json()
    assert created["name"] == "Wealth Advisory Package"
    assert created["status"] == "OPEN"
    assert created["assigned_rm_id"] == 1

    # Validation: Negative potential value
    bad_val = {**valid_payload, "potential_value": -100}
    res_bad_val = client.post("/api/v1/rm/me/opportunities", json=bad_val)
    assert res_bad_val.status_code in [400, 422]

    # Validation: Probability > 100
    bad_prob = {**valid_payload, "probability": 150}
    res_bad_prob = client.post("/api/v1/rm/me/opportunities", json=bad_prob)
    assert res_bad_prob.status_code in [400, 422]

    # Validation: Unauthorized customer (belongs to Bob)
    unauth_cust = {**valid_payload, "customer_id": 2}
    res_unauth = client.post("/api/v1/rm/me/opportunities", json=unauth_cust)
    assert res_unauth.status_code == 403

    app.dependency_overrides.pop(get_current_user)
