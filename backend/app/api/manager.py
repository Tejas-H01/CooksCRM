import uuid
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User, Team, Action, Lead, Customer, AuditLog
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.action import ActionResponse
from app.schemas.lead import ManagerLeadResponse
from app.schemas.performance import TeamPerformanceResponse, ManagerAlertResponse, ManagerAchievementResponse, ManagerRMDetailResponse
from app.services.performance_service import PerformanceService
from app.services.action_service import ActionService

logger = logging.getLogger(__name__)

router = APIRouter()

def require_branch_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "BRANCH_MANAGER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: BRANCH_MANAGER role required"
        )
    return current_user

def get_manager_team(manager: User, db: Session) -> Team:
    team = db.query(Team).filter(Team.manager_id == manager.id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No branch/team managed by this user."
        )
    return team

def map_manager_lead(lead: Lead, db: Session) -> ManagerLeadResponse:
    cust = db.query(Customer).filter(Customer.id == lead.customer_id).first() if lead.customer_id else None
    rm = db.query(User).filter(User.id == lead.assigned_rm_id).first() if lead.assigned_rm_id else None
    pot = float(lead.potential_value) if lead.potential_value is not None else 0.0
    act = float(lead.actual_value) if lead.actual_value is not None else 0.0
    rem = max(0.0, pot - act)
    
    return ManagerLeadResponse(
        id=lead.id,
        name=lead.name,
        customer_id=lead.customer_id,
        customer_name=cust.name if cust else None,
        assigned_rm_id=lead.assigned_rm_id,
        rm_name=rm.username if rm else None,
        source=lead.source,
        stage=lead.stage,
        status=lead.status,
        potential_value=pot,
        actual_value=act,
        remaining_value=rem,
        probability=lead.probability if lead.probability is not None else 50,
        expected_close_date=lead.expected_close_date,
        next_follow_up=lead.next_follow_up,
        created_at=lead.created_at
    )

@router.get("/manager/branch")
def get_manager_branch(current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    team = get_manager_team(current_mgr, db)
    return {"id": team.id, "name": team.name}

@router.get("/manager/rms", response_model=List[UserResponse])
def get_manager_rms(current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    team = get_manager_team(current_mgr, db)
    return db.query(User).filter(User.team_id == team.id, User.role == "RM").all()

@router.get("/manager/actions", response_model=List[ActionResponse])
def get_manager_actions(current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    team = get_manager_team(current_mgr, db)
    rms = db.query(User).filter(User.team_id == team.id, User.role == "RM").all()
    rm_ids = [rm.id for rm in rms]
    if not rm_ids:
        return []
    return db.query(Action).filter(Action.rm_id.in_(rm_ids)).all()

@router.get("/manager/leads", response_model=List[ManagerLeadResponse])
def get_manager_leads(current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    team = get_manager_team(current_mgr, db)
    rms = db.query(User).filter(User.team_id == team.id, User.role == "RM").all()
    rm_ids = [rm.id for rm in rms]
    if not rm_ids:
        return []
    leads = db.query(Lead).filter(Lead.assigned_rm_id.in_(rm_ids)).all()
    return [map_manager_lead(l, db) for l in leads]

@router.get("/manager/rms/{rm_id}/detail", response_model=ManagerRMDetailResponse)
def get_manager_rm_detail(rm_id: int, current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    team = get_manager_team(current_mgr, db)
    target_rm = db.query(User).filter(User.id == rm_id, User.role == "RM").first()
    if not target_rm or target_rm.team_id != team.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Requested RM does not belong to your branch/team."
        )
    
    perf = PerformanceService.get_rm_performance(db, rm_id=target_rm.id)
    raw_leads = db.query(Lead).filter(Lead.assigned_rm_id == target_rm.id).all()
    mapped_leads = [map_manager_lead(l, db) for l in raw_leads]
    actions = ActionService.get_actions(db, rm_id=target_rm.id)
    
    return ManagerRMDetailResponse(
        rm_id=target_rm.id,
        rm_name=target_rm.username,
        performance=perf,
        leads=mapped_leads,
        actions=actions
    )

@router.get("/manager/performance", response_model=TeamPerformanceResponse)
def get_manager_performance(current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    team = get_manager_team(current_mgr, db)
    return PerformanceService.get_team_performance(db, team.id)

@router.get("/manager/alerts", response_model=List[ManagerAlertResponse])
def get_manager_alerts(current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    return PerformanceService.get_manager_alerts(db, manager_id=current_mgr.id)

@router.get("/manager/achievements", response_model=List[ManagerAchievementResponse])
def get_manager_achievements(current_mgr: User = Depends(require_branch_manager), db: Session = Depends(get_db)):
    return PerformanceService.get_manager_achievements(db, manager_id=current_mgr.id)

from pydantic import BaseModel, Field
import uuid
import logging
from app.models.models import AuditLog
logger = logging.getLogger(__name__)

class ReassignLeadRequest(BaseModel):
    new_rm_id: int
    reason: Optional[str] = None

class ReassignActionRequest(BaseModel):
    new_rm_id: int
    reason: Optional[str] = None

class ResolveActionRequest(BaseModel):
    notes: Optional[str] = None

@router.post("/manager/leads/{lead_id}/reassign", response_model=ManagerLeadResponse)
async def reassign_branch_lead(
    lead_id: int,
    req: ReassignLeadRequest,
    current_mgr: User = Depends(require_branch_manager),
    db: Session = Depends(get_db)
):
    team = get_manager_team(current_mgr, db)
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead/Opportunity not found.")
    
    # Verify current lead belongs to manager's branch
    current_rm = db.query(User).filter(User.id == lead.assigned_rm_id).first() if lead.assigned_rm_id else None
    if current_rm and current_rm.team_id != team.id:
        raise HTTPException(status_code=403, detail="Unauthorized: Lead belongs to another branch.")
    
    # Verify target RM belongs to manager's branch
    new_rm = db.query(User).filter(User.id == req.new_rm_id, User.role == "RM").first()
    if not new_rm or new_rm.team_id != team.id:
        raise HTTPException(status_code=403, detail="Unauthorized: Target RM does not belong to your branch.")
    
    old_rm_id = lead.assigned_rm_id
    lead.assigned_rm_id = new_rm.id
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    
    # Audit log
    db.add(AuditLog(
        user_id=current_mgr.id,
        action="LEAD_REASSIGNED_BY_MANAGER",
        payload={
            "lead_id": lead.id,
            "old_rm_id": old_rm_id,
            "new_rm_id": new_rm.id,
            "reason": req.reason
        }
    ))
    db.commit()

    # Event ingestion
    try:
        from app.schemas.event import EventCreate, EventType
        from app.services.event_service import ingest_event
        await ingest_event(db, EventCreate(
            event_type=EventType.ACTION_REASSIGNED,
            entity_type="LEAD",
            entity_id=str(lead.id),
            actor_id=str(current_mgr.id),
            payload={
                "old_rm_id": old_rm_id,
                "new_rm_id": new_rm.id,
                "reason": req.reason or "Reassigned by Branch Manager"
            },
            idempotency_key=f"lead_reassign_{lead.id}_{uuid.uuid4().hex[:8]}"
        ))
    except Exception as e:
        logger.warning(f"Failed to ingest lead reassign event: {e}")

    return map_manager_lead(lead, db)

@router.post("/manager/actions/{action_id}/reassign", response_model=ActionResponse)
async def reassign_branch_action(
    action_id: str,
    req: ReassignActionRequest,
    current_mgr: User = Depends(require_branch_manager),
    db: Session = Depends(get_db)
):
    team = get_manager_team(current_mgr, db)
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
    
    # Verify action belongs to manager's branch
    act_rm = db.query(User).filter(User.id == action.rm_id).first()
    if act_rm and act_rm.team_id != team.id:
        raise HTTPException(status_code=403, detail="Unauthorized: Action belongs to another branch.")
    
    # Verify target RM belongs to manager's branch
    new_rm = db.query(User).filter(User.id == req.new_rm_id, User.role == "RM").first()
    if not new_rm or new_rm.team_id != team.id:
        raise HTTPException(status_code=403, detail="Unauthorized: Target RM does not belong to your branch.")
    
    old_rm_id = action.rm_id
    action = ActionService.reassign_action(db, action_id, new_rm_id=new_rm.id)

    # Audit log
    db.add(AuditLog(
        user_id=current_mgr.id,
        action="ACTION_REASSIGNED_BY_MANAGER",
        payload={
            "action_id": action.id,
            "old_rm_id": old_rm_id,
            "new_rm_id": new_rm.id,
            "reason": req.reason
        }
    ))
    db.commit()

    return action

@router.post("/manager/actions/{action_id}/resolve", response_model=ActionResponse)
async def resolve_branch_action(
    action_id: str,
    req: Optional[ResolveActionRequest] = None,
    current_mgr: User = Depends(require_branch_manager),
    db: Session = Depends(get_db)
):
    team = get_manager_team(current_mgr, db)
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
    
    act_rm = db.query(User).filter(User.id == action.rm_id).first()
    if act_rm and act_rm.team_id != team.id:
        raise HTTPException(status_code=403, detail="Unauthorized: Action belongs to another branch.")
    
    outcome = {"resolution": req.notes or "Resolved by Branch Manager"} if req else {"resolution": "Resolved by Branch Manager"}
    action = ActionService.complete_action(db, action_id, outcome=outcome)
    
    return action
