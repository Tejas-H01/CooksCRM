from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class RMPerformanceResponse(BaseModel):
    rm_id: int
    rm_name: str
    period: str
    target: float
    achieved: float
    achievement_percentage: float
    expected_run_rate: float
    target_gap: float
    conversion_rate: float
    pipeline_value: float
    pipeline_coverage: float
    calls_completed: int
    meetings_completed: int
    followups_completed: int
    overdue_followups: int
    sla_breach_count: int
    high_value_opportunities: int
    untouched_high_intent_leads: int
    average_lead_ageing: float
    benchmark: Dict[str, str]
    risk_drivers: List[str]
    positive_drivers: List[str]

class RMRanking(BaseModel):
    rm_id: int
    rm_name: str
    achievement_percentage: float
    conversion_rate: float
    pipeline_value: float

class TeamPerformanceResponse(BaseModel):
    team_id: int
    team_name: str
    team_target: float
    team_achievement: float
    team_achievement_percentage: float
    expected_run_rate: float
    target_gap: float
    average_conversion: float
    total_pipeline: float
    overdue_follow_ups: int
    sla_breach_count: int
    rm_rankings: List[RMRanking]
    top_performers: List[str]
    at_risk_rms: List[str]

class ManagerAlertResponse(BaseModel):
    type: str
    severity: str
    rm_id: int
    rm_name: str
    current: float
    expected: float
    gap: float
    reason: str
    recommended_focus: str

class ManagerAchievementResponse(BaseModel):
    rm_id: int
    rm_name: str
    achievement_type: str
    reason: str
    detected_at: datetime
