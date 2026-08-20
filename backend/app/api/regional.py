from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.models import User, Team
from app.api.auth import get_current_user
from app.schemas.performance import TeamPerformanceResponse, ManagerAlertResponse, ManagerAchievementResponse
from app.services.performance_service import PerformanceService

router = APIRouter()

def require_regional_head(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "REGIONAL_HEAD":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: REGIONAL_HEAD role required"
        )
    return current_user

def get_reporting_managers(regional_head: User, db: Session) -> List[User]:
    return db.query(User).filter(
        User.parent_id == regional_head.id,
        User.role == "BRANCH_MANAGER"
    ).all()

@router.get("/regional/branches")
def get_regional_branches(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    mgrs = get_reporting_managers(current_rh, db)
    mgr_ids = [m.id for m in mgrs]
    if not mgr_ids:
        return []
    teams = db.query(Team).filter(Team.manager_id.in_(mgr_ids)).all()
    return [{"id": t.id, "name": t.name, "manager_name": t.manager.username if t.manager else None} for t in teams]

@router.get("/regional/performance", response_model=List[TeamPerformanceResponse])
def get_regional_performance(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    mgrs = get_reporting_managers(current_rh, db)
    mgr_ids = [m.id for m in mgrs]
    if not mgr_ids:
        return []
    teams = db.query(Team).filter(Team.manager_id.in_(mgr_ids)).all()
    
    responses = []
    for team in teams:
        responses.append(PerformanceService.get_team_performance(db, team.id))
    return responses

@router.get("/regional/alerts", response_model=List[ManagerAlertResponse])
def get_regional_alerts(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    mgrs = get_reporting_managers(current_rh, db)
    alerts = []
    for mgr in mgrs:
        alerts.extend(PerformanceService.get_manager_alerts(db, manager_id=mgr.id))
    return alerts

@router.get("/regional/achievements", response_model=List[ManagerAchievementResponse])
def get_regional_achievements(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    mgrs = get_reporting_managers(current_rh, db)
    achievements = []
    for mgr in mgrs:
        achievements.extend(PerformanceService.get_manager_achievements(db, manager_id=mgr.id))
    return achievements
