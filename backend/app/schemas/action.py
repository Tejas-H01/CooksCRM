from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum

class ActionType(str, Enum):
    CALL_CUSTOMER = "CALL_CUSTOMER"
    FOLLOW_UP = "FOLLOW_UP"
    ESCALATE_SLA = "ESCALATE_SLA"
    OPPORTUNITY_AT_RISK = "OPPORTUNITY_AT_RISK"
    HIGH_INTENT = "HIGH_INTENT"
    TARGET_GAP = "TARGET_GAP"
    CROSS_SELL = "CROSS_SELL"
    REACTIVATE_CUSTOMER = "REACTIVATE_CUSTOMER"
    SPECIAL_ACHIEVEMENT = "SPECIAL_ACHIEVEMENT"

class ActionPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ActionStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    SNOOZED = "SNOOZED"
    REASSIGNED = "REASSIGNED"
    DISMISSED = "DISMISSED"

class ActionBase(BaseModel):
    rm_id: int
    customer_id: Optional[int] = None
    lead_id: Optional[int] = None
    action_type: ActionType
    priority: ActionPriority
    score: float = 0.0
    factors: Optional[dict] = None
    outcome: Optional[dict] = None
    title: str
    description: Optional[str] = None
    reason: Optional[str] = None
    source_event_id: Optional[str] = None
    status: ActionStatus = ActionStatus.PENDING
    due_at: datetime

class ActionCreate(ActionBase):
    pass

class ActionResponse(ActionBase):
    id: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
