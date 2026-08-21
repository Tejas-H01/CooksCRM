import pytest
import asyncio
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.database import Base, get_db
from app.main import app
from app.core.queue import event_queue_manager
from app.core.worker import start_queue_worker
from app.schemas.event import EventCreate, EventType
from app.services.event_service import ingest_event
from app.models.models import Event
from app.engine.simulator_engine import simulator_engine

# Database setup for tests
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

@pytest.mark.asyncio
async def test_queue_enqueue_dequeue():
    # Clear the queue stats first
    event_queue_manager._processed_count = 0
    event_queue_manager._failed_count = 0
    event_queue_manager._total_queued = 0
    
    # Empty queue if items left
    while event_queue_manager.queue.qsize() > 0:
        await event_queue_manager.dequeue()
        event_queue_manager.task_done()

    event_payload = {"id": "123", "event_type": "PRODUCT_VIEW", "entity_type": "CUSTOMER", "entity_id": "1"}
    await event_queue_manager.enqueue(event_payload)
    
    stats = await event_queue_manager.get_stats()
    assert stats["queue_depth"] == 1
    assert stats["total_queued"] == 1
    
    popped = await event_queue_manager.dequeue()
    assert popped["id"] == "123"
    event_queue_manager.task_done()

@pytest.mark.asyncio
async def test_ingest_event_enqueues(db_session):
    event_data = EventCreate(
        event_type=EventType.PRODUCT_VIEW,
        entity_type="CUSTOMER",
        entity_id="1",
        payload={"product": "SaaS Starter Plan"},
        idempotency_key="unique_ingest_test_key"
    )
    
    # Ensure queue is clean
    while event_queue_manager.queue.qsize() > 0:
        await event_queue_manager.dequeue()
        event_queue_manager.task_done()
        
    db_event = await ingest_event(db_session, event_data)
    assert db_event.idempotency_key == "unique_ingest_test_key"
    
    stats = await event_queue_manager.get_stats()
    assert stats["queue_depth"] >= 1

def test_api_returns_202_accepted(client):
    event_data = {
        "event_type": "PRODUCT_VIEW",
        "entity_type": "CUSTOMER",
        "entity_id": "1",
        "payload": {"product": "SaaS Pro Plan"},
        "idempotency_key": "api_202_test_key"
    }
    
    response = client.post("/api/v1/events/ingest", json=event_data)
    assert response.status_code == 202
    res_data = response.json()
    assert res_data["idempotency_key"] == "api_202_test_key"

def test_simulator_stats_and_start_stop(client):
    response = client.get("/api/v1/simulator/stats")
    assert response.status_code == 200
    stats = response.json()
    assert "queue_depth" in stats
    assert "is_simulator_running" in stats
    
    # Start simulator
    response = client.post("/api/v1/simulator/start")
    assert response.status_code == 200
    
    # Check stats
    response = client.get("/api/v1/simulator/stats")
    assert response.json()["is_simulator_running"] is True
    
    # Stop simulator
    response = client.post("/api/v1/simulator/stop")
    assert response.status_code == 200
    
    response = client.get("/api/v1/simulator/stats")
    assert response.json()["is_simulator_running"] is False

@pytest.mark.asyncio
async def test_simulator_blueprint_generation():
    # Empty queue
    while event_queue_manager.queue.qsize() > 0:
        await event_queue_manager.dequeue()
        event_queue_manager.task_done()
        
    # Trigger a journey
    await simulator_engine.trigger_journey("HIGH_INTENT_CUSTOMER", "1")
    
    # Yield execution to let the triggered async journey task run and enqueue steps
    await asyncio.sleep(0.1)
    
    # Verify events are enqueued
    stats = await event_queue_manager.get_stats()
    assert stats["queue_depth"] == 4  # HIGH_INTENT_CUSTOMER blueprint has 4 steps
