import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.models import User, Team, Action, Lead, Customer, AuditLog
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.action import ActionResponse
from app.schemas.lead import ManagerLeadResponse
from app.schemas.performance import (
    TeamPerformanceResponse, 
    ManagerAlertResponse, 
    ManagerAchievementResponse,
    BranchPerformanceItem,
    RegionalDashboardResponse
)
from app.services.performance_service import PerformanceService
from app.services.action_service import ActionService
from app.api.manager import map_manager_lead

logger = logging.getLogger(__name__)

router = APIRouter()

def require_regional_head(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "REGIONAL_HEAD":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: REGIONAL_HEAD role required"
        )
    return current_user

def get_reporting_managers(regional_head: User, db: Session) -> List[User]:
    bms = db.query(User).filter(
        User.parent_id == regional_head.id,
        User.role == "BRANCH_MANAGER"
    ).all()
    if not bms:
        bms = db.query(User).filter(User.role == "BRANCH_MANAGER").all()
    return bms

def build_regional_summary(rh: User, db: Session) -> RegionalDashboardResponse:
    bms = get_reporting_managers(rh, db)
    bm_ids = [m.id for m in bms]
    
    if not bm_ids:
        return RegionalDashboardResponse(
            regional_head_id=rh.id,
            region_name="Northern Region",
            regional_target=0.0,
            regional_achieved=0.0,
            regional_achievement_percentage=0.0,
            expected_run_rate=67.74,
            total_pipeline=0.0,
            total_weighted_pipeline=0.0,
            active_branches_count=0,
            at_risk_branches_count=0,
            executive_brief="No active branches currently assigned to this region.",
            branch_performance=[],
            pipeline_by_stage=[],
            risks=[],
            high_value_opportunities=[],
            actions=[],
            recognition=[]
        )

    teams = db.query(Team).filter(Team.manager_id.in_(bm_ids)).all()
    
    regional_target = 0.0
    regional_achieved = 0.0
    regional_pipeline = 0.0
    regional_weighted_pipeline = 0.0
    branch_items: List[BranchPerformanceItem] = []
    all_team_ids = [t.id for t in teams]

    # Collect subordinate RMs across all regional branches
    sub_rms = db.query(User).filter(User.team_id.in_(all_team_ids), User.role == "RM").all() if all_team_ids else []
    sub_rm_ids = [rm.id for rm in sub_rms]

    at_risk_branches_count = 0

    for team in teams:
        perf = PerformanceService.get_team_performance(db, team.id)
        regional_target += perf.team_target
        regional_achieved += perf.team_achievement
        regional_pipeline += perf.total_pipeline
        regional_weighted_pipeline += perf.total_weighted_pipeline

        mgr = db.query(User).filter(User.id == team.manager_id).first()
        is_risk = perf.team_achievement_percentage < perf.expected_run_rate or perf.sla_breach_count > 0
        if is_risk:
            at_risk_branches_count += 1

        branch_items.append(BranchPerformanceItem(
            branch_id=team.id,
            branch_name=team.name,
            id=team.id,
            name=team.name,
            manager_id=mgr.id if mgr else None,
            manager_name=mgr.username if mgr else "Unknown",
            target=perf.team_target,
            achieved=perf.team_achievement,
            achievement_percentage=round(perf.team_achievement_percentage, 1),
            expected_run_rate=round(perf.expected_run_rate, 1),
            target_gap=round(max(0.0, perf.team_target - perf.team_achievement), 1),
            pipeline=perf.total_pipeline,
            weighted_pipeline=perf.total_weighted_pipeline,
            conversion_rate=round(perf.average_conversion, 1),
            sla_breaches=perf.sla_breach_count,
            at_risk_rms_count=len(perf.at_risk_rms),
            status="Needs Attention" if is_risk else "On Track"
        ))

    regional_ach_pct = round((regional_achieved / regional_target * 100.0), 1) if regional_target > 0 else 0.0

    # Executive Brief
    exec_brief = f"Region is operating at {regional_ach_pct}% achievement against an expected run-rate of 67.7%. "
    if at_risk_branches_count > 0:
        exec_brief += f"Management attention required: {at_risk_branches_count} branch(es) currently lagging behind run-rate or showing SLA risks."
    else:
        exec_brief += "All regional branches are performing on or above expected target run-rates."

    # Pipeline by Stage aggregation
    stage_counts = {}
    stage_values = {}
    if sub_rm_ids:
        raw_leads = db.query(Lead).filter(Lead.assigned_rm_id.in_(sub_rm_ids), Lead.status == "OPEN").all()
        for l in raw_leads:
            stg = l.stage or "QUALIFIED"
            val = float(l.potential_value or 0.0)
            stage_counts[stg] = stage_counts.get(stg, 0) + 1
            stage_values[stg] = stage_values.get(stg, 0.0) + val

    pipeline_by_stage = [
        {"stage": stg, "count": count, "value": round(stage_values[stg], 1)}
        for stg, count in stage_counts.items()
    ]

    # Risks
    risks = []
    for b in branch_items:
        if b.achievement_percentage < b.expected_run_rate:
            risks.append({
                "severity": "HIGH" if (b.expected_run_rate - b.achievement_percentage) > 15 else "MEDIUM",
                "branch_name": b.branch_name,
                "manager_name": b.manager_name,
                "category": "Run-Rate Lag",
                "reason": f"Branch achievement of {b.achievement_percentage}% lags expected run-rate ({b.expected_run_rate}%).",
                "recommended_action": "Review branch RM workload & conduct pipeline intervention."
            })
        if b.sla_breaches > 0:
            risks.append({
                "severity": "HIGH",
                "branch_name": b.branch_name,
                "manager_name": b.manager_name,
                "category": "SLA Breach",
                "reason": f"{b.sla_breaches} active SLA breach(es) detected in branch.",
                "recommended_action": "Escalate overdue actions to Branch Manager."
            })

    # High Value Opportunities (>= ₹1.0L)
    high_val_leads = []
    if sub_rm_ids:
        hv_raw = db.query(Lead).filter(
            Lead.assigned_rm_id.in_(sub_rm_ids), 
            Lead.potential_value >= 100000, 
            Lead.status == "OPEN"
        ).order_by(Lead.potential_value.desc()).limit(10).all()
        high_val_leads = [map_manager_lead(l, db) for l in hv_raw]

    # Actions across regional branches
    regional_actions = []
    if sub_rm_ids:
        raw_acts = db.query(Action).filter(Action.rm_id.in_(sub_rm_ids)).order_by(Action.due_at.asc()).limit(15).all()
        regional_actions = [ActionResponse.model_validate(a) for a in raw_acts]

    # Recognition / Highlights
    recognition = []
    if branch_items:
        top_branch = max(branch_items, key=lambda b: b.achievement_percentage)
        if top_branch.achievement_percentage > 0:
            recognition.append({
                "title": "Top Performing Branch",
                "branch_name": top_branch.branch_name,
                "manager_name": top_branch.manager_name,
                "metric": f"{top_branch.achievement_percentage}% Target Achievement",
                "type": "PERFORMANCE_LEADER"
            })
        crossed_target = [b for b in branch_items if b.achievement_percentage >= 100.0]
        for b in crossed_target:
            recognition.append({
                "title": "Target Milestone Achieved",
                "branch_name": b.branch_name,
                "manager_name": b.manager_name,
                "metric": f"{b.achievement_percentage}% Target Cross",
                "type": "MILESTONE_EXCEEDED"
            })

    # Benchmarking Matrix
    benchmarking_matrix = []
    for b in branch_items:
        run_rate_diff = round(b.achievement_percentage - b.expected_run_rate, 1)
        tier = "Top Tier" if b.achievement_percentage >= 100.0 else "Above Benchmark" if run_rate_diff >= 0 else "Needs Improvement"
        benchmarking_matrix.append({
            "branch_id": b.branch_id,
            "branch_name": b.branch_name,
            "manager_name": b.manager_name,
            "achievement_pct": b.achievement_percentage,
            "conversion_rate": b.conversion_rate,
            "run_rate_diff": run_rate_diff,
            "benchmark_tier": tier
        })

    # Product Intelligence
    prod_counts = {}
    prod_values = {}
    if sub_rm_ids:
        all_regional_leads = db.query(Lead).filter(Lead.assigned_rm_id.in_(sub_rm_ids)).all()
        for l in all_regional_leads:
            prod = l.name or "Investment Product"
            val = float(l.potential_value or 0.0)
            prod_counts[prod] = prod_counts.get(prod, 0) + 1
            prod_values[prod] = prod_values.get(prod, 0.0) + val

    product_intelligence = [
        {
            "product_name": prod,
            "lead_count": count,
            "total_pipeline": round(prod_values[prod], 1),
            "average_deal_size": round(prod_values[prod] / count, 1) if count > 0 else 0.0
        }
        for prod, count in prod_counts.items()
    ]

    return RegionalDashboardResponse(
        regional_head_id=rh.id,
        region_name="Northern Region",
        regional_target=round(regional_target, 1),
        regional_achieved=round(regional_achieved, 1),
        regional_achievement_percentage=regional_ach_pct,
        expected_run_rate=67.74,
        total_pipeline=round(regional_pipeline, 1),
        total_weighted_pipeline=round(regional_weighted_pipeline, 1),
        active_branches_count=len(branch_items),
        at_risk_branches_count=at_risk_branches_count,
        executive_brief=exec_brief,
        branch_performance=branch_items,
        pipeline_by_stage=pipeline_by_stage,
        risks=risks,
        high_value_opportunities=high_val_leads,
        actions=regional_actions,
        recognition=recognition,
        benchmarking_matrix=benchmarking_matrix,
        product_intelligence=product_intelligence
    )

@router.get("/regional/dashboard", response_model=RegionalDashboardResponse)
def get_regional_dashboard(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    return build_regional_summary(current_rh, db)

@router.get("/regional/overview", response_model=RegionalDashboardResponse)
def get_regional_overview(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    return build_regional_summary(current_rh, db)

@router.get("/regional/branches")
def get_regional_branches(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    summary = build_regional_summary(current_rh, db)
    return summary.branch_performance

@router.get("/regional/branches/{branch_id}")
def get_regional_branch_detail(branch_id: int, current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    bms = get_reporting_managers(current_rh, db)
    bm_ids = [m.id for m in bms]
    team = db.query(Team).filter(Team.id == branch_id, Team.manager_id.in_(bm_ids)).first()
    if not team:
        raise HTTPException(status_code=404, detail="Branch not found or outside regional scope.")
    
    perf = PerformanceService.get_team_performance(db, team.id)
    sub_rms = db.query(User).filter(User.team_id == team.id, User.role == "RM").all()
    rm_ids = [r.id for r in sub_rms]

    raw_leads = db.query(Lead).filter(Lead.assigned_rm_id.in_(rm_ids)).all() if rm_ids else []
    raw_acts = db.query(Action).filter(Action.rm_id.in_(rm_ids)).all() if rm_ids else []

    mgr = db.query(User).filter(User.id == team.manager_id).first()

    return {
        "branch_id": team.id,
        "branch_name": team.name,
        "manager": {"id": mgr.id, "username": mgr.username, "email": mgr.email} if mgr else None,
        "performance": perf,
        "subordinate_rms": [{"id": r.id, "username": r.username, "email": r.email} for r in sub_rms],
        "leads": [map_manager_lead(l, db) for l in raw_leads],
        "actions": [ActionResponse.model_validate(a) for a in raw_acts]
    }

@router.get("/regional/performance", response_model=List[BranchPerformanceItem])
def get_regional_performance(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    summary = build_regional_summary(current_rh, db)
    return summary.branch_performance

@router.get("/regional/risk")
def get_regional_risk(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    summary = build_regional_summary(current_rh, db)
    return summary.risks

@router.get("/regional/opportunities", response_model=List[ManagerLeadResponse])
def get_regional_opportunities(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    summary = build_regional_summary(current_rh, db)
    return summary.high_value_opportunities

@router.get("/regional/actions", response_model=List[ActionResponse])
def get_regional_actions(current_rh: User = Depends(require_regional_head), db: Session = Depends(get_db)):
    summary = build_regional_summary(current_rh, db)
    return summary.actions

@router.post("/regional/actions/{action_id}/resolve", response_model=ActionResponse)
async def resolve_regional_action(
    action_id: str,
    notes: Optional[str] = None,
    current_rh: User = Depends(require_regional_head),
    db: Session = Depends(get_db)
):
    summary = build_regional_summary(current_rh, db)
    valid_action_ids = [a.id for a in summary.actions]
    if action_id not in valid_action_ids:
        raise HTTPException(status_code=403, detail="Unauthorized: Action outside your regional scope.")

    act = ActionService.complete_action(db, action_id, outcome={"notes": notes, "resolved_by_role": "REGIONAL_HEAD"})
    if not act:
        raise HTTPException(status_code=404, detail="Action not found.")

    db.add(AuditLog(
        user_id=current_rh.id,
        action="ACTION_RESOLVED_BY_REGIONAL_HEAD",
        payload={"action_id": action_id, "notes": notes}
    ))
    db.commit()

    return ActionResponse.model_validate(act)
