import datetime
import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base, get_db
from app.models.models import User, Action, Event, Lead, Target
from app.api.auth import get_current_user

from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
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
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def override_get_current_user(client):
    def _override(user: User):
        app.dependency_overrides[get_current_user] = lambda: user
    return _override

def test_complete_action_generates_event(client, db_session, override_get_current_user):
    rm = User(id=1, username="rm_test", email="rm@test.com", hashed_password="pw", role="RM")
    db_session.add(rm)
    db_session.commit()
    
    action = Action(id="act_1", action_type="CALL_CUSTOMER", rm_id=1, customer_id=1, status="PENDING", priority="MEDIUM", title="Test Action", due_at=datetime.datetime.utcnow())
    db_session.add(action)
    db_session.commit()

    override_get_current_user(rm)
    
    response = client.post("/api/v1/actions/act_1/complete", json={"outcome": {"notes": "done"}})
    assert response.status_code == 200
    assert response.json()["status"] == "COMPLETED"
    
    event = db_session.query(Event).filter(Event.entity_type == "ACTION", Event.entity_id == "act_1").first()
    assert event is not None
    assert event.event_type == "ACTION_COMPLETED"
    assert event.payload["outcome"]["notes"] == "done"

def test_snooze_action_generates_event(client, db_session, override_get_current_user):
    rm = User(id=2, username="rm_test2", email="rm2@test.com", hashed_password="pw", role="RM")
    action = Action(id="act_2", action_type="CALL_CUSTOMER", rm_id=2, customer_id=1, status="PENDING", priority="MEDIUM", title="Test Action", due_at=datetime.datetime.utcnow())
    db_session.add_all([rm, action])
    db_session.commit()

    override_get_current_user(rm)
    
    response = client.post("/api/v1/actions/act_2/snooze", json={"minutes": 120})
    assert response.status_code == 200
    assert response.json()["status"] == "SNOOZED"
    
    event = db_session.query(Event).filter(Event.entity_type == "ACTION", Event.entity_id == "act_2").first()
    assert event is not None
    assert event.event_type == "ACTION_SNOOZED"
    assert event.payload["snooze_minutes"] == 120

def test_unauthorized_action_access(client, db_session, override_get_current_user):
    rm1 = User(id=3, username="rm1", email="rm1@test.com", hashed_password="pw", role="RM")
    rm2 = User(id=4, username="rm2", email="rm2@test.com", hashed_password="pw", role="RM")
    action = Action(id="act_3", action_type="CALL_CUSTOMER", rm_id=3, customer_id=1, status="PENDING", priority="MEDIUM", title="Test Action", due_at=datetime.datetime.utcnow())
    db_session.add_all([rm1, rm2, action])
    db_session.commit()

    override_get_current_user(rm2)
    response = client.post("/api/v1/actions/act_3/complete", json={})
    assert response.status_code == 403

def test_get_rm_schedule_endpoint(client, db_session, override_get_current_user):
    rm = User(id=5, username="rm_sch", email="rm_sch@test.com", hashed_password="pw", role="RM")
    now = datetime.datetime.utcnow()
    act = Action(id="act_sch_1", action_type="MEETING", rm_id=5, customer_id=1, status="PENDING", priority="HIGH", title="Meeting with Client", due_at=now)
    lead = Lead(id=5, assigned_rm_id=5, name="Lead Followup", status="OPEN", stage="NEW", next_follow_up=now)
    db_session.add_all([rm, act, lead])
    db_session.commit()

    override_get_current_user(rm)
    response = client.get("/api/v1/rm/me/schedule")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert items[0]["title"] == "Meeting with Client"

def test_idempotent_event_target_update(db_session):
    from app.engine.event_processor import EventProcessor
    import asyncio
    
    rm = User(id=10, username="rm10", email="rm10@t.com", hashed_password="pw", role="RM")
    target = Target(id=10, rm_id=10, product="MF", period="monthly", target_value=Decimal("100000"), achieved_value=Decimal("0"))
    lead = Lead(id=10, customer_id=10, assigned_rm_id=10, potential_value=Decimal("50000"), actual_value=Decimal("0"), status="OPEN")
    db_session.add_all([rm, target, lead])
    db_session.commit()
    
    event = Event(id="evt_10", event_type="PAYIN_RECEIVED", entity_type="LEAD", entity_id="10", payload={"amount": 10000}, status="PROCESSED", idempotency_key="idemp_10")
    db_session.add(event)
    db_session.commit()
    
    asyncio.run(EventProcessor.process_event({"id": "evt_10", "event_type": "PAYIN_RECEIVED"}))
    
    db_session.refresh(target)
    assert target.achieved_value == Decimal("0")
