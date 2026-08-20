from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.schemas.performance import RMPerformanceResponse, TeamPerformanceResponse, ManagerAlertResponse, ManagerAchievementResponse
from app.services.performance_service import PerformanceService

router = APIRouter()

@router.get("/performance/rm/{rm_id}", response_model=RMPerformanceResponse)
def get_rm_performance(rm_id: int, db: Session = Depends(get_db)):
    try:
        return PerformanceService.get_rm_performance(db, rm_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/performance/team/{team_id}", response_model=TeamPerformanceResponse)
def get_team_performance(team_id: int, db: Session = Depends(get_db)):
    try:
        return PerformanceService.get_team_performance(db, team_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/performance/manager/{manager_id}", response_model=List[TeamPerformanceResponse])
def get_manager_performance(manager_id: int, db: Session = Depends(get_db)):
    # Find all teams managed by this manager
    from app.models.models import Team
    teams = db.query(Team).filter(Team.manager_id == manager_id).all()
    if not teams:
        return []
    
    responses = []
    for team in teams:
        responses.append(PerformanceService.get_team_performance(db, team.id))
    return responses

@router.get("/manager/alerts", response_model=List[ManagerAlertResponse])
def get_manager_alerts(manager_id: Optional[int] = None, db: Session = Depends(get_db)):
    return PerformanceService.get_manager_alerts(db, manager_id=manager_id)

@router.get("/manager/achievements", response_model=List[ManagerAchievementResponse])
def get_manager_achievements(manager_id: Optional[int] = None, db: Session = Depends(get_db)):
    return PerformanceService.get_manager_achievements(db, manager_id=manager_id)
