from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, field_validator
from enum import Enum

class EventType(str, Enum):
    NEW_LEAD = "NEW_LEAD"
    LEAD_CONTACTED = "LEAD_CONTACTED"
    LEAD_NOT_CONTACTED = "LEAD_NOT_CONTACTED"
    CALL_COMPLETED = "CALL_COMPLETED"
    MEETING_COMPLETED = "MEETING_COMPLETED"
    FOLLOWUP_CREATED = "FOLLOWUP_CREATED"
    FOLLOWUP_COMPLETED = "FOLLOWUP_COMPLETED"
    PAYIN_RECEIVED = "PAYIN_RECEIVED"
    PRODUCT_PURCHASED = "PRODUCT_PURCHASED"
    ORDER_COMPLETED = "ORDER_COMPLETED"
    REDEMPTION = "REDEMPTION"
    CUSTOMER_BECAME_ACTIVE = "CUSTOMER_BECAME_ACTIVE"
    WEBSITE_VISIT = "WEBSITE_VISIT"
    PRODUCT_ENQUIRY = "PRODUCT_ENQUIRY"
    CAMPAIGN_RESPONSE = "CAMPAIGN_RESPONSE"
    CONVERSION_COMPLETED = "CONVERSION_COMPLETED"
    TARGET_UPDATED = "TARGET_UPDATED"
    SLA_UPDATED = "SLA_UPDATED"
    BENCHMARK_UPDATED = "BENCHMARK_UPDATED"

class EventBase(BaseModel):
    event_type: EventType
    entity_type: str
    entity_id: str
    actor_id: Optional[str] = None
    payload: Dict[str, Any]
    occurred_at: Optional[datetime] = None
    idempotency_key: str

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: str
    processed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
