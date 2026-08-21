from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.db.database import get_db
from app.schemas.action import ActionResponse
from app.services.action_service import ActionService
from app.api.auth import get_current_user
from app.models.models import User

router = APIRouter()

class CompleteRequest(BaseModel):
    outcome: Optional[Dict[str, Any]] = None

class SnoozeRequest(BaseModel):
    minutes: Optional[int] = 60

class ReassignRequest(BaseModel):
    new_rm_id: int

class OutcomeRequest(BaseModel):
    outcome: Dict[str, Any]

def _check_action_access(action, current_user: User):
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Action not found."
        )
    if current_user.role == "RM" and action.rm_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this action."
        )

@router.get("/actions", response_model=List[ActionResponse])
def get_actions(
    rm_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "RM":
        if rm_id is not None and rm_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view other RM's actions."
            )
        rm_id = current_user.id

    return ActionService.get_actions(db, rm_id=rm_id, status=status)

@router.get("/actions/{action_id}", response_model=ActionResponse)
def get_action(
    action_id: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = ActionService.get_action_by_id(db, action_id)
    _check_action_access(action, current_user)
    return action

@router.post("/actions/{action_id}/complete", response_model=ActionResponse)
async def complete_action(
    action_id: str, 
    req: Optional[CompleteRequest] = None, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = ActionService.get_action_by_id(db, action_id)
    _check_action_access(action, current_user)
    
    outcome = req.outcome if req else None
    action = ActionService.complete_action(db, action_id, outcome=outcome)
    
    import uuid
    from app.schemas.event import EventCreate, EventType
    from app.services.event_service import ingest_event
    await ingest_event(db, EventCreate(
        event_type=EventType.ACTION_COMPLETED,
        entity_type="ACTION",
        entity_id=action.id,
        actor_id=str(current_user.id),
        payload={"outcome": outcome} if outcome else {},
        idempotency_key=f"act_comp_{action.id}_{uuid.uuid4().hex[:8]}"
    ))
    
    return action

@router.post("/actions/{action_id}/snooze", response_model=ActionResponse)
async def snooze_action(
    action_id: str, 
    req: Optional[SnoozeRequest] = None, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = ActionService.get_action_by_id(db, action_id)
    _check_action_access(action, current_user)
    
    minutes = req.minutes if req else 60
    action = ActionService.snooze_action(db, action_id, minutes=minutes)
    
    import uuid
    from app.schemas.event import EventCreate, EventType
    from app.services.event_service import ingest_event
    await ingest_event(db, EventCreate(
        event_type=EventType.ACTION_SNOOZED,
        entity_type="ACTION",
        entity_id=action.id,
        actor_id=str(current_user.id),
        payload={"snooze_minutes": minutes},
        idempotency_key=f"act_snz_{action.id}_{uuid.uuid4().hex[:8]}"
    ))
    
    return action

@router.post("/actions/{action_id}/reassign", response_model=ActionResponse)
async def reassign_action(
    action_id: str, 
    req: ReassignRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = ActionService.get_action_by_id(db, action_id)
    _check_action_access(action, current_user)
    
    action = ActionService.reassign_action(db, action_id, new_rm_id=req.new_rm_id)
    
    import uuid
    from app.schemas.event import EventCreate, EventType
    from app.services.event_service import ingest_event
    await ingest_event(db, EventCreate(
        event_type=EventType.ACTION_REASSIGNED,
        entity_type="ACTION",
        entity_id=action.id,
        actor_id=str(current_user.id),
        payload={"old_rm_id": current_user.id, "new_rm_id": req.new_rm_id},
        idempotency_key=f"act_rsgn_{action.id}_{uuid.uuid4().hex[:8]}"
    ))
    
    return action

@router.post("/actions/{action_id}/outcome", response_model=ActionResponse)
async def record_outcome(
    action_id: str, 
    req: OutcomeRequest, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = ActionService.get_action_by_id(db, action_id)
    _check_action_access(action, current_user)
    
    action = ActionService.record_outcome(db, action_id, outcome=req.outcome)
    
    import uuid
    from app.schemas.event import EventCreate, EventType
    from app.services.event_service import ingest_event
    await ingest_event(db, EventCreate(
        event_type=EventType.ACTION_OUTCOME_RECORDED,
        entity_type="ACTION",
        entity_id=action.id,
        actor_id=str(current_user.id),
        payload={"outcome": req.outcome},
        idempotency_key=f"act_out_{action.id}_{uuid.uuid4().hex[:8]}"
    ))
    
    return action
