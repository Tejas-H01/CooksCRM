from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from app.db.database import get_db
from app.models.models import User, Team, Event, Action, Customer, Lead, AuditLog
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.services.auth_service import AuthService
from app.services.performance_service import PerformanceService
from datetime import datetime

router = APIRouter()

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str
    team_id: Optional[int] = None
    parent_id: Optional[int] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    team_id: Optional[int] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None

class RoleUpdate(BaseModel):
    role: str

class TeamCreate(BaseModel):
    name: str
    manager_id: Optional[int] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    manager_id: Optional[int] = None

class FailedEventResponse(BaseModel):
    id: str
    event_type: str
    status: str
    occurred_at: datetime
    retry_count: int
    error_message: Optional[str] = None
    processed_at: Optional[datetime] = None

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: ADMIN role required"
        )
    return current_user

def log_audit(db: Session, user_id: Optional[int], action: str, ip_address: Optional[str], payload: dict):
    # Filter sensitive payload fields
    safe_payload = {}
    if payload:
        for k, v in payload.items():
            if any(term in k.lower() for term in ["password", "hash", "secret", "token"]):
                continue
            safe_payload[k] = v
            
    audit = AuditLog(
        user_id=user_id,
        action=action,
        ip_address=ip_address,
        payload=safe_payload
    )
    db.add(audit)
    db.commit()

@router.get("/admin/users", response_model=List[UserResponse])
def get_admin_users(current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/admin/users", response_model=UserResponse)
def create_admin_user(request: UserCreate, request_obj: Request, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    existing = db.query(User).filter((User.username == request.username) | (User.email == request.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    hashed = AuthService.hash_password(request.password)
    user = User(
        username=request.username,
        email=request.email,
        hashed_password=hashed,
        role=request.role,
        team_id=request.team_id,
        parent_id=request.parent_id,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    ip = request_obj.client.host if request_obj.client else None
    log_audit(db, current_admin.id, "USER_CREATED", ip, {"user_id": user.id, "username": user.username, "role": user.role})
    
    return user

@router.patch("/admin/users/{id}", response_model=UserResponse)
def update_admin_user(id: int, request: UserUpdate, request_obj: Request, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    audit_payload = {"user_id": id}
    if request.username is not None:
        user.username = request.username
        audit_payload["username"] = request.username
    if request.email is not None:
        user.email = request.email
    if request.role is not None:
        user.role = request.role
        audit_payload["role"] = request.role
    if request.team_id is not None:
        user.team_id = request.team_id
    if request.parent_id is not None:
        user.parent_id = request.parent_id
    if request.is_active is not None:
        user.is_active = request.is_active
        audit_payload["is_active"] = request.is_active
        
    db.commit()
    db.refresh(user)
    
    ip = request_obj.client.host if request_obj.client else None
    log_audit(db, current_admin.id, "USER_UPDATED", ip, audit_payload)
    
    return user

@router.patch("/admin/users/{id}/role", response_model=UserResponse)
def update_user_role(id: int, request: RoleUpdate, request_obj: Request, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return update_admin_user(id, UserUpdate(role=request.role), request_obj, current_admin, db)

@router.get("/admin/teams")
def get_admin_teams(current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    return [{"id": t.id, "name": t.name, "manager_id": t.manager_id} for t in teams]

@router.post("/admin/teams")
def create_admin_team(request: TeamCreate, request_obj: Request, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    team = Team(name=request.name, manager_id=request.manager_id)
    db.add(team)
    db.commit()
    db.refresh(team)
    
    ip = request_obj.client.host if request_obj.client else None
    log_audit(db, current_admin.id, "TEAM_CREATED", ip, {"team_id": team.id, "name": team.name})
    
    return {"id": team.id, "name": team.name, "manager_id": team.manager_id}

@router.patch("/admin/teams/{id}")
def update_admin_team(id: int, request: TeamUpdate, request_obj: Request, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )
    
    audit_payload = {"team_id": id}
    if request.name is not None:
        team.name = request.name
        audit_payload["name"] = request.name
    if request.manager_id is not None:
        team.manager_id = request.manager_id
        audit_payload["manager_id"] = request.manager_id
        
    db.commit()
    db.refresh(team)
    
    ip = request_obj.client.host if request_obj.client else None
    log_audit(db, current_admin.id, "TEAM_UPDATED", ip, audit_payload)
    
    return {"id": team.id, "name": team.name, "manager_id": team.manager_id}

@router.get("/admin/events/failed", response_model=List[FailedEventResponse])
def get_failed_events(current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Event).filter(Event.status == "FAILED").all()

@router.post("/admin/events/{id}/retry")
async def retry_failed_event(id: str, request_obj: Request, current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    if event.status != "FAILED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only events in FAILED status can be retried."
        )
        
    event.status = "PENDING"
    event.retry_count += 1
    event.error_message = None
    db.commit()
    
    # Publish to EventBus
    from app.events.event_bus import event_bus
    await event_bus.publish(event.event_type, {
        "id": event.id,
        "event_type": event.event_type,
        "entity_type": event.entity_type,
        "entity_id": event.entity_id,
        "actor_id": event.actor_id,
        "payload": event.payload,
        "idempotency_key": event.idempotency_key
    })
    
    ip = request_obj.client.host if request_obj.client else None
    log_audit(db, current_admin.id, "EVENT_RETRIED", ip, {"event_id": event.id, "event_type": event.event_type, "retry_count": event.retry_count})
    
    return {"status": "retrying", "event_id": event.id, "retry_count": event.retry_count}

@router.get("/admin/overview")
def get_admin_overview(current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_leads = db.query(Lead).count()
    total_customers = db.query(Customer).count()
    
    total_actions = db.query(Action).count()
    pending_actions = db.query(Action).filter(Action.status == "PENDING").count()
    completed_actions = db.query(Action).filter(Action.status == "COMPLETED").count()
    critical_actions = db.query(Action).filter(Action.priority.in_(["CRITICAL", "HIGH"])).count()
    
    total_events = db.query(Event).count()
    processed_events = db.query(Event).filter(Event.status == "PROCESSED").count()
    failed_events = db.query(Event).filter(Event.status == "FAILED").count()
    
    health_pct = round((processed_events / total_events * 100.0), 2) if total_events > 0 else 100.0
    
    # Recent activity
    recent_events = db.query(Event).order_by(Event.occurred_at.desc()).limit(5).all()
    activity = [{"id": e.id, "type": e.event_type, "time": e.occurred_at} for e in recent_events]
    
    # Scoped alerts
    alerts = PerformanceService.get_manager_alerts(db)
    alert_list = [{"type": a.type, "rm_name": a.rm_name, "reason": a.reason} for a in alerts]
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_leads": total_leads,
        "total_customers": total_customers,
        "actions": {
            "total": total_actions,
            "pending": pending_actions,
            "completed": completed_actions,
            "critical_high": critical_actions
        },
        "events": {
            "total": total_events,
            "processed": processed_events,
            "failed": failed_events,
            "processing_health_percentage": health_pct
        },
        "recent_activity": activity,
        "alerts": alert_list
    }

@router.get("/admin/audit-logs")
def get_audit_logs(current_admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).all()
    return [{
        "id": log.id,
        "actor": log.user.username if log.user else "System",
        "action": log.action,
        "ip_address": log.ip_address,
        "metadata": log.payload,
        "timestamp": log.created_at
    } for log in logs]

@router.get("/admin/roles")
def get_admin_roles(current_admin: User = Depends(require_admin)):
    return ["ADMIN", "REGIONAL_HEAD", "BRANCH_MANAGER", "RM"]

@router.get("/admin/permissions")
def get_admin_permissions(current_admin: User = Depends(require_admin)):
    # Static python permissions catalog
    return {
        "RM": [
            "profile:read", "customer:read_own", "lead:read_own",
            "action:read_own", "action:update_own", "performance:read_own"
        ],
        "BRANCH_MANAGER": [
            "profile:read", "branch:read", "customer:read_branch",
            "lead:read_branch", "action:read_branch", "performance:read_branch",
            "alert:read_branch", "achievement:read_branch"
        ],
        "REGIONAL_HEAD": [
            "profile:read", "region:read", "branch:read_regional",
            "performance:read_regional", "alert:read_regional", "achievement:read_regional"
        ],
        "ADMIN": [
            "profile:read", "user:manage", "team:manage",
            "target:manage", "benchmark:manage", "system:config"
        ]
    }
