from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import Event
from app.schemas.event import EventCreate
from app.core.queue import event_queue_manager
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

async def ingest_event(db: Session, event_data: EventCreate) -> Event:
    # 1. Idempotency Check
    existing_event = db.query(Event).filter(Event.idempotency_key == event_data.idempotency_key).first()
    if existing_event:
        logger.warning(f"Event with idempotency key '{event_data.idempotency_key}' already exists. Ignoring.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Event with idempotency key '{event_data.idempotency_key}' already processed."
        )

    # 2. Create and Save Event
    db_event = Event(
        event_type=event_data.event_type.value,
        entity_type=event_data.entity_type,
        entity_id=event_data.entity_id,
        actor_id=event_data.actor_id,
        payload=event_data.payload,
        occurred_at=event_data.occurred_at or datetime.utcnow(),
        idempotency_key=event_data.idempotency_key,
        status="PENDING",
        processed_at=None
    )

    db.add(db_event)
    try:
        db.commit()
        db.refresh(db_event)
    except Exception as e:
        db.rollback()
        logger.error(f"Error persisting event: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist event to the database."
        )

    # 3. Queue the event
    event_dict = {
        "id": db_event.id,
        "event_type": db_event.event_type,
        "entity_type": db_event.entity_type,
        "entity_id": db_event.entity_id,
        "actor_id": db_event.actor_id,
        "payload": db_event.payload,
        "occurred_at": db_event.occurred_at.isoformat() if db_event.occurred_at else None,
        "idempotency_key": db_event.idempotency_key
    }
    logger.info(f"[INGEST] event={db_event.id} type={db_event.event_type} status=QUEUED")
    if getattr(event_queue_manager, "disabled", False):
        from app.events.event_bus import event_bus
        await event_bus.publish(db_event.event_type, event_dict)
    else:
        await event_queue_manager.enqueue(event_dict)

    return db_event
