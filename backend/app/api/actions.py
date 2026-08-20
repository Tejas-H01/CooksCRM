from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.db.database import get_db
from app.schemas.action import ActionResponse
from app.services.action_service import ActionService

router = APIRouter()

class CompleteRequest(BaseModel):
    outcome: Optional[Dict[str, Any]] = None

class SnoozeRequest(BaseModel):
    minutes: Optional[int] = 60

class ReassignRequest(BaseModel):
    new_rm_id: int

class OutcomeRequest(BaseModel):
    outcome: Dict[str, Any]

@router.get("/actions", response_model=List[ActionResponse])
def get_actions(
    rm_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return ActionService.get_actions(db, rm_id=rm_id, status=status)

@router.get("/actions/{action_id}", response_model=ActionResponse)
def get_action(action_id: str, db: Session = Depends(get_db)):
    action = ActionService.get_action_by_id(db, action_id)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action with ID '{action_id}' not found."
        )
    return action

@router.post("/actions/{action_id}/complete", response_model=ActionResponse)
def complete_action(action_id: str, req: Optional[CompleteRequest] = None, db: Session = Depends(get_db)):
    outcome = req.outcome if req else None
    action = ActionService.complete_action(db, action_id, outcome=outcome)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action with ID '{action_id}' not found."
        )
    return action

@router.post("/actions/{action_id}/snooze", response_model=ActionResponse)
def snooze_action(action_id: str, req: Optional[SnoozeRequest] = None, db: Session = Depends(get_db)):
    minutes = req.minutes if req else 60
    action = ActionService.snooze_action(db, action_id, minutes=minutes)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action with ID '{action_id}' not found."
        )
    return action

@router.post("/actions/{action_id}/reassign", response_model=ActionResponse)
def reassign_action(action_id: str, req: ReassignRequest, db: Session = Depends(get_db)):
    action = ActionService.reassign_action(db, action_id, new_rm_id=req.new_rm_id)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action with ID '{action_id}' not found."
        )
    return action

@router.post("/actions/{action_id}/outcome", response_model=ActionResponse)
def record_outcome(action_id: str, req: OutcomeRequest, db: Session = Depends(get_db)):
    action = ActionService.record_outcome(db, action_id, outcome=req.outcome)
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action with ID '{action_id}' not found."
        )
    return action
