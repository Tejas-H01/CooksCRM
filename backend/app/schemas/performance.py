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
    weighted_pipeline: float
    remaining_opportunity: float
    remaining_target: float
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
    target: float = 0.0
    achieved: float = 0.0
    remaining_target: float = 0.0
    achievement_percentage: float = 0.0
    conversion_rate: float = 0.0
    pipeline_value: float = 0.0
    weighted_pipeline: float = 0.0
    overdue_followups: int = 0
    status: str = "On Track"

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
    total_weighted_pipeline: float
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

from app.schemas.action import ActionResponse
from app.schemas.lead import ManagerLeadResponse

class ManagerRMDetailResponse(BaseModel):
    rm_id: int
    rm_name: str
    performance: RMPerformanceResponse
    leads: List[ManagerLeadResponse]
    actions: List[ActionResponse]

class BranchPerformanceItem(BaseModel):
    branch_id: int
    branch_name: str
    id: Optional[int] = None
    name: Optional[str] = None
    manager_id: Optional[int] = None
    manager_name: Optional[str] = None
    target: float = 0.0
    achieved: float = 0.0
    achievement_percentage: float = 0.0
    expected_run_rate: float = 67.74
    target_gap: float = 0.0
    pipeline: float = 0.0
    weighted_pipeline: float = 0.0
    conversion_rate: float = 0.0
    sla_breaches: int = 0
    at_risk_rms_count: int = 0
    status: str = "On Track"

class RegionalDashboardResponse(BaseModel):
    regional_head_id: int
    region_name: str = "Northern Region"
    regional_target: float
    regional_achieved: float
    regional_achievement_percentage: float
    expected_run_rate: float = 67.74
    total_pipeline: float
    total_weighted_pipeline: float
    active_branches_count: int
    at_risk_branches_count: int
    executive_brief: str
    branch_performance: List[BranchPerformanceItem]
    pipeline_by_stage: List[Dict[str, Any]]
    risks: List[Dict[str, Any]]
    high_value_opportunities: List[ManagerLeadResponse]
    actions: List[ActionResponse]
    recognition: List[Dict[str, Any]]
    benchmarking_matrix: List[Dict[str, Any]] = []
    product_intelligence: List[Dict[str, Any]] = []
