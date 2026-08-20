from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import User, Customer, Lead, Action
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.action import ActionResponse
from app.schemas.performance import RMPerformanceResponse
from app.services.performance_service import PerformanceService
from app.services.action_service import ActionService

router = APIRouter()

def require_rm(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "RM":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: RM role required"
        )
    return current_user

@router.get("/rm/me", response_model=UserResponse)
def get_rm_me(current_rm: User = Depends(require_rm)):
    return current_rm

@router.get("/rm/me/customers")
def get_rm_customers(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return db.query(Customer).filter(Customer.assigned_rm_id == current_rm.id).all()

@router.get("/rm/me/leads")
def get_rm_leads(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return db.query(Lead).filter(Lead.assigned_rm_id == current_rm.id).all()

@router.get("/rm/me/actions", response_model=List[ActionResponse])
def get_rm_actions(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return ActionService.get_actions(db, rm_id=current_rm.id)

@router.get("/rm/me/performance", response_model=RMPerformanceResponse)
def get_rm_performance(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return PerformanceService.get_rm_performance(db, current_rm.id)
