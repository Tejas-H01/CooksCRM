import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.database import Base
from app.models.models import User, Team, Customer, Lead, Target, Benchmark, Event, Action
from app.schemas.event import EventCreate, EventType
from app.engine.priority_engine import PriorityEngine
from app.services.event_service import ingest_event
from app.services.action_service import ActionService
from app.engine.event_processor import EventProcessor
from app.events.event_bus import event_bus
import app.engine.rules


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        # Create seed data for testing
        team = Team(name="Test Team")
        session.add(team)
        session.commit()

        rm1 = User(id=1, username="alice", email="alice@test.com", hashed_password="pw", role="RM", team_id=team.id)
        rm2 = User(id=2, username="bob", email="bob@test.com", hashed_password="pw", role="RM", team_id=team.id)
        manager = User(id=3, username="manager", email="mgr@test.com", hashed_password="pw", role="TEAM_LEAD", team_id=team.id)
        session.add_all([rm1, rm2, manager])
        session.commit()

        team.manager_id = manager.id
        session.commit()

        # Add customer
        cust = Customer(id=1, name="John Doe", email="jd@test.com", phone="123", segment="HNW", assigned_rm_id=rm1.id)
        session.add(cust)
        session.commit()

        # Add benchmark
        bm = Benchmark(metric="conversion_rate", scope="organization", value=Decimal("78.00"), period="monthly")
        session.add(bm)
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

import pytest_asyncio

@pytest_asyncio.fixture(autouse=True)
async def setup_event_subscriptions(monkeypatch, db_session):
    import app.engine.event_processor
    db_session.close = lambda: None
    monkeypatch.setattr(app.engine.event_processor, "SessionLocal", lambda: db_session)

    for event_type in EventType:
        await event_bus.subscribe(event_type.value, EventProcessor.process_event)
    yield
    for event_type in EventType:
        await event_bus.unsubscribe(event_type.value, EventProcessor.process_event)

@pytest.mark.asyncio
async def test_sla_breach_rule(db_session):
    lead = Lead(
        id=1,
        customer_id=1,
        name="High Value Deal",
        potential_value=Decimal("1200000.00"),
        assigned_rm_id=1,
        last_contact=None,
        sla_deadline=datetime.utcnow() - timedelta(hours=1),
        status="OPEN"
    )
    db_session.add(lead)
    db_session.commit()

    event_data = EventCreate(
        event_type=EventType.LEAD_NOT_CONTACTED,
        entity_type="LEAD",
        entity_id="1",
        payload={},
        idempotency_key="key_sla"
    )
    await ingest_event(db_session, event_data)

    actions = db_session.query(Action).filter(Action.action_type == "ESCALATE_SLA").all()
    assert len(actions) == 1
    assert actions[0].priority == "CRITICAL"
    assert actions[0].score >= 90
    assert "configured SLA has been breached" in actions[0].reason

@pytest.mark.asyncio
async def test_duplicate_event_prevention(db_session):
    event_data = EventCreate(
        event_type=EventType.LEAD_NOT_CONTACTED,
        entity_type="LEAD",
        entity_id="1",
        payload={},
        idempotency_key="key_dup"
    )
    await ingest_event(db_session, event_data)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        await ingest_event(db_session, event_data)
    assert exc.value.status_code == 409

@pytest.mark.asyncio
async def test_payin_opportunity_rule(db_session):
    event_data = EventCreate(
        event_type=EventType.PAYIN_RECEIVED,
        entity_type="CUSTOMER",
        entity_id="1",
        payload={"amount": 750000.00},
        idempotency_key="key_payin"
    )
    await ingest_event(db_session, event_data)

    actions = db_session.query(Action).filter(Action.action_type == "OPPORTUNITY_AT_RISK").all()
    assert len(actions) == 1
    assert "no follow-up activity is scheduled" in actions[0].reason

@pytest.mark.asyncio
async def test_high_intent_correlation(db_session):
    base_key = str(uuid.uuid4())
    e1 = EventCreate(event_type=EventType.WEBSITE_VISIT, entity_type="CUSTOMER", entity_id="1", payload={}, idempotency_key=f"hi_1_{base_key}")
    e2 = EventCreate(event_type=EventType.PRODUCT_ENQUIRY, entity_type="CUSTOMER", entity_id="1", payload={}, idempotency_key=f"hi_2_{base_key}")
    e3 = EventCreate(event_type=EventType.CAMPAIGN_RESPONSE, entity_type="CUSTOMER", entity_id="1", payload={}, idempotency_key=f"hi_3_{base_key}")

    await ingest_event(db_session, e1)
    await ingest_event(db_session, e2)
    await ingest_event(db_session, e3)

    actions = db_session.query(Action).filter(Action.action_type == "HIGH_INTENT").all()
    assert len(actions) == 1
    assert "Multiple high-intent signals" in actions[0].reason

@pytest.mark.asyncio
async def test_target_gap_rule(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("200000.00"), achieved_value=Decimal("122000.00"))
    db_session.add(target)
    db_session.commit()

    event_data = EventCreate(
        event_type=EventType.TARGET_UPDATED,
        entity_type="USER",
        entity_id="1",
        payload={},
        idempotency_key="key_gap"
    )
    await ingest_event(db_session, event_data)

    actions = db_session.query(Action).filter(Action.action_type == "TARGET_GAP").all()
    assert len(actions) == 1
    assert "Target gap is -17.0 percentage points" in actions[0].reason

@pytest.mark.asyncio
async def test_special_achievement_rule(db_session):
    target = Target(rm_id=1, product="Mutual Funds", period="monthly", target_value=Decimal("200000.00"), achieved_value=Decimal("250000.00"))
    db_session.add(target)
    db_session.commit()

    event_data = EventCreate(
        event_type=EventType.TARGET_UPDATED,
        entity_type="USER",
        entity_id="1",
        payload={},
        idempotency_key="key_spec"
    )
    await ingest_event(db_session, event_data)

    actions = db_session.query(Action).filter(Action.action_type == "SPECIAL_ACHIEVEMENT").all()
    assert len(actions) == 1
    assert "exceeding the 120% milestone" in actions[0].reason

def test_priority_score_deterministic():
    p1, s1, f1 = PriorityEngine.calculate_priority(80, 70, 60, 50, 40)
    p2, s2, f2 = PriorityEngine.calculate_priority(80, 70, 60, 50, 40)
    assert p1 == p2
    assert s1 == s2
    assert f1 == f2

def test_changing_priority_weights(monkeypatch):
    monkeypatch.setattr(settings, "WEIGHT_URGENCY", 0.90)
    monkeypatch.setattr(settings, "WEIGHT_OPPORTUNITY_VALUE", 0.02)
    monkeypatch.setattr(settings, "WEIGHT_SLA_RISK", 0.02)
    monkeypatch.setattr(settings, "WEIGHT_CUSTOMER_IMPORTANCE", 0.03)
    monkeypatch.setattr(settings, "WEIGHT_INTENT", 0.03)

    _, s1, _ = PriorityEngine.calculate_priority(100, 0, 0, 0, 0)
    assert s1 == 90

@pytest.mark.asyncio
async def test_action_completion(db_session):
    action = Action(
        id="act_1",
        rm_id=1,
        action_type="FOLLOW_UP",
        priority="MEDIUM",
        title="Follow up",
        due_at=datetime.utcnow(),
        status="PENDING"
    )
    db_session.add(action)
    db_session.commit()

    updated = ActionService.complete_action(db_session, "act_1", outcome={"result": "called"})
    assert updated.status == "COMPLETED"
    assert updated.outcome == {"result": "called"}
    assert updated.completed_at is not None

@pytest.mark.asyncio
async def test_action_snooze(db_session):
    action = Action(
        id="act_2",
        rm_id=1,
        action_type="FOLLOW_UP",
        priority="MEDIUM",
        title="Follow up",
        due_at=datetime.utcnow(),
        status="PENDING"
    )
    db_session.add(action)
    db_session.commit()

    updated = ActionService.snooze_action(db_session, "act_2", minutes=30)
    assert updated.status == "SNOOZED"
    assert updated.due_at > datetime.utcnow() + timedelta(minutes=25)

@pytest.mark.asyncio
async def test_action_reassignment(db_session):
    action = Action(
        id="act_3",
        rm_id=1,
        action_type="FOLLOW_UP",
        priority="MEDIUM",
        title="Follow up",
        due_at=datetime.utcnow(),
        status="PENDING"
    )
    db_session.add(action)
    db_session.commit()

    updated = ActionService.reassign_action(db_session, "act_3", new_rm_id=2)
    assert updated.status == "REASSIGNED"
    assert updated.rm_id == 2

@pytest.mark.asyncio
async def test_outcome_storage(db_session):
    action = Action(
        id="act_4",
        rm_id=1,
        action_type="FOLLOW_UP",
        priority="MEDIUM",
        title="Follow up",
        due_at=datetime.utcnow(),
        status="PENDING"
    )
    db_session.add(action)
    db_session.commit()

    updated = ActionService.record_outcome(db_session, "act_4", outcome={"note": "agreed to meet"})
    assert updated.outcome == {"note": "agreed to meet"}

@pytest.mark.asyncio
async def test_duplicate_action_prevention(db_session):
    action = Action(
        rm_id=1,
        customer_id=1,
        action_type="FOLLOW_UP",
        priority="MEDIUM",
        title="Follow up",
        due_at=datetime.utcnow(),
        status="PENDING"
    )
    ActionService.create_action(db_session, action)

    action2 = Action(
        rm_id=1,
        customer_id=1,
        action_type="FOLLOW_UP",
        priority="MEDIUM",
        title="Follow up",
        due_at=datetime.utcnow(),
        status="PENDING"
    )
    res = ActionService.create_action(db_session, action2)
    assert res.id == action.id

@pytest.mark.asyncio
async def test_non_interfering_events(db_session):
    cust2 = Customer(id=2, name="Bob Builder", email="bb@test.com", segment="HNW", assigned_rm_id=2)
    db_session.add(cust2)
    db_session.commit()

    event1 = EventCreate(
        event_type=EventType.PAYIN_RECEIVED,
        entity_type="CUSTOMER",
        entity_id="1",
        payload={"amount": 600000.00},
        idempotency_key="key_entity_1"
    )
    event2 = EventCreate(
        event_type=EventType.PAYIN_RECEIVED,
        entity_type="CUSTOMER",
        entity_id="2",
        payload={"amount": 600000.00},
        idempotency_key="key_entity_2"
    )
    await ingest_event(db_session, event1)
    await ingest_event(db_session, event2)

    actions = db_session.query(Action).filter(Action.action_type == "OPPORTUNITY_AT_RISK").all()
    assert len(actions) == 2

@pytest.mark.asyncio
async def test_high_intent_correlation_window(db_session):
    base_key = str(uuid.uuid4())
    e1 = EventCreate(event_type=EventType.WEBSITE_VISIT, entity_type="CUSTOMER", entity_id="1", payload={}, idempotency_key=f"hw_1_{base_key}")
    e2 = EventCreate(event_type=EventType.PRODUCT_ENQUIRY, entity_type="CUSTOMER", entity_id="1", payload={}, idempotency_key=f"hw_2_{base_key}")

    db_event1 = Event(
        event_type=e1.event_type.value,
        entity_type=e1.entity_type,
        entity_id=e1.entity_id,
        payload=e1.payload,
        occurred_at=datetime.utcnow() - timedelta(hours=5),
        idempotency_key=e1.idempotency_key
    )
    db_session.add(db_event1)
    db_session.commit()

    await ingest_event(db_session, e2)

    actions = db_session.query(Action).filter(Action.action_type == "HIGH_INTENT").all()
    assert len(actions) == 0
