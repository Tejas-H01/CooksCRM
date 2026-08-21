from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.schemas.event import EventCreate, EventResponse
from app.models.models import Event
from app.services.event_service import ingest_event
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/events/ingest", response_model=EventResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_event_endpoint(event_data: EventCreate, db: Session = Depends(get_db)):
    logger.info(f"Received event ingestion request: {event_data.event_type}")
    return await ingest_event(db, event_data)

@router.get("/events", response_model=List[EventResponse])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).order_by(Event.created_at.desc()).limit(50).all()
