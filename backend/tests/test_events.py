import pytest
from datetime import datetime
from pydantic import ValidationError
from app.schemas.event import EventCreate, EventType
from app.events.event_bus import InMemoryEventBus
from app.services.event_service import ingest_event
from app.models.models import Event
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
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

def test_event_schema_validation():
    valid_data = {
        "event_type": "NEW_LEAD",
        "entity_type": "lead",
        "entity_id": "123",
        "actor_id": "user_1",
        "payload": {"source": "website"},
        "idempotency_key": "unique_key_1"
    }
    event = EventCreate(**valid_data)
    assert event.event_type == EventType.NEW_LEAD
    assert event.idempotency_key == "unique_key_1"

    invalid_data = valid_data.copy()
    invalid_data["event_type"] = "INVALID_TYPE"
    with pytest.raises(ValidationError):
        EventCreate(**invalid_data)

@pytest.mark.asyncio
async def test_event_ingestion_and_idempotency(db_session):
    event_data = EventCreate(
        event_type=EventType.NEW_LEAD,
        entity_type="lead",
        entity_id="123",
        payload={"source": "website"},
        idempotency_key="unique_key_123"
    )

    db_event = await ingest_event(db_session, event_data)
    assert db_event.idempotency_key == "unique_key_123"

    db_record = db_session.query(Event).filter_by(idempotency_key="unique_key_123").first()
    assert db_record is not None
    assert db_record.event_type == "NEW_LEAD"

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as excinfo:
        await ingest_event(db_session, event_data)
    assert excinfo.value.status_code == 409

@pytest.mark.asyncio
async def test_event_bus_pub_sub():
    bus = InMemoryEventBus()
    received_events = []

    async def callback(event):
        received_events.append(event)

    await bus.subscribe("TEST_CHANNEL", callback)

    test_payload = {"key": "value"}
    await bus.publish("TEST_CHANNEL", test_payload)

    assert len(received_events) == 1
    assert received_events[0] == test_payload

    await bus.unsubscribe("TEST_CHANNEL", callback)
    await bus.publish("TEST_CHANNEL", test_payload)

    assert len(received_events) == 1
