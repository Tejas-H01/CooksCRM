from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import User, Team, Action
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.action import ActionResponse
from app.schemas.performance import TeamPerformanceResponse, ManagerAlertResponse, ManagerAchievementResponse
from app.services.performance_service import PerformanceService

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
