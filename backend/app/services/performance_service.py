from datetime import datetime, timedelta
import calendar
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from app.models.models import User, Team, Customer, Lead, Target, Benchmark, Event, Action
from app.core.config import settings
from app.schemas.performance import RMPerformanceResponse, TeamPerformanceResponse, RMRanking, ManagerAlertResponse, ManagerAchievementResponse

class PerformanceService:
    @staticmethod
    def _get_expected_run_rate() -> float:
        """
        Dynamically calculates the elapsed percentage of the current month.
        """
        now = datetime.utcnow()
        year = now.year
        month = now.month
        day = now.day
        days_in_month = calendar.monthrange(year, month)[1]
        
        # Calculate fraction of the month elapsed
        elapsed = day / days_in_month
        return round(elapsed * 100.0, 2)

    @classmethod
    def get_rm_performance(cls, db: Session, rm_id: int) -> RMPerformanceResponse:
        rm = db.query(User).filter(User.id == rm_id, User.role == "RM").first()
        if not rm:
            raise ValueError(f"RM with ID {rm_id} not found.")

        # 1. Target and Achievement calculations
        target = db.query(Target).filter(Target.rm_id == rm_id).first()
        target_val = float(target.target_value) if target else 0.0
        achieved_val = float(target.achieved_value) if target else 0.0
        achievement_pct = round((achieved_val / target_val * 100.0), 2) if target_val > 0.0 else 0.0

        expected_run_rate = cls._get_expected_run_rate()
        target_gap = round(achievement_pct - expected_run_rate, 2)

        # 2. Conversion Rate
        # conversion_rate = converted leads / qualified leads * 100
        # Converted leads: status/stage is CONVERTED or COMPLETED or WON
        # Qualified leads: stage is QUALIFIED, CONVERTED, COMPLETED or WON
        converted_count = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.stage.in_(["CONVERTED", "COMPLETED", "WON"])
        ).count()
        
        qualified_count = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.stage.in_(["QUALIFIED", "CONVERTED", "COMPLETED", "WON"])
        ).count()

        conversion_rate = round((converted_count / qualified_count * 100.0), 2) if qualified_count > 0 else 0.0

        # 3. Activity metrics from events
        calls_count = db.query(Event).filter(
            Event.actor_id == str(rm_id),
            Event.event_type == "CALL_COMPLETED"
        ).count()

        meetings_count = db.query(Event).filter(
            Event.actor_id == str(rm_id),
            Event.event_type == "MEETING_COMPLETED"
        ).count()

        followups_count = db.query(Event).filter(
            Event.actor_id == str(rm_id),
            Event.event_type == "FOLLOWUP_COMPLETED"
        ).count()

        # 4. Pipeline calculations
        open_leads_list = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.status == "OPEN"
        ).all()
        
        pipeline_value = 0.0
        weighted_pipeline = 0.0
        remaining_opportunity = 0.0
        
        for l in open_leads_list:
            expected = float(l.potential_value) if l.potential_value is not None else 0.0
            actual = float(l.actual_value) if l.actual_value is not None else 0.0
            prob = float(l.probability) / 100.0 if l.probability is not None else 0.5
            rem_opp = max(0.0, expected - actual)
            
            pipeline_value += expected
            remaining_opportunity += rem_opp
            weighted_pipeline += (rem_opp * prob)

        remaining_target = max(0.0, target_val - achieved_val)
        if remaining_target > 0:
            pipeline_coverage = round(weighted_pipeline / remaining_target, 2)
        else:
            pipeline_coverage = 99.0 if weighted_pipeline > 0.0 else 0.0

        # 5. SLA & Ageing
        overdue_followups = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.next_follow_up < datetime.utcnow(),
            Lead.status == "OPEN"
        ).count()

        sla_breach_count = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.sla_deadline < datetime.utcnow(),
            Lead.status == "OPEN"
        ).count()

        # Average Lead Ageing
        open_leads = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.status == "OPEN"
        ).all()
        if open_leads:
            total_age = sum((datetime.utcnow() - l.created_at).total_seconds() for l in open_leads)
            avg_age_days = round((total_age / len(open_leads)) / 86400.0, 2)
        else:
            avg_age_days = 0.0

        high_value_opportunities = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.potential_value >= settings.HIGH_VALUE_THRESHOLD,
            Lead.status == "OPEN"
        ).count()

        # Untouched High Intent Leads (Pending Action "HIGH_INTENT")
        untouched_high_intent_leads = db.query(Action).filter(
            Action.rm_id == rm_id,
            Action.action_type == "HIGH_INTENT",
            Action.status == "PENDING"
        ).count()

        # 6. Benchmark Comparisons
        # Compare RM metrics against team or organizational benchmarks
        benchmarks = db.query(Benchmark).all()
        benchmark_map = {}
        for bm in benchmarks:
            benchmark_map[bm.metric] = float(bm.value)

        comp_achievement = "below expected run-rate" if achievement_pct < expected_run_rate else "at"
        if achievement_pct >= expected_run_rate + 5:
            comp_achievement = "above expected run-rate"

        conv_bm = benchmark_map.get("conversion_rate", 78.0)
        comp_conversion = "below expected" if conversion_rate < conv_bm else "at"
        if conversion_rate >= conv_bm + 5:
            comp_conversion = "above expected"

        # Pipeline coverage benchmark (standard is 3.0x coverage)
        comp_pipeline = "below benchmark" if pipeline_coverage < 3.0 else "at"
        if pipeline_coverage >= 4.0:
            comp_pipeline = "above benchmark"

        benchmark_eval = {
            "achievement": comp_achievement,
            "conversion": comp_conversion,
            "pipeline": comp_pipeline
        }

        # 7. Risk & Positive Drivers (Deterministic insights)
        risk_drivers = []
        positive_drivers = []

        if target_gap < 0:
            risk_drivers.append(f"Achievement is {abs(target_gap):.1f} percentage points below expected run-rate.")
        else:
            positive_drivers.append(f"Achievement is {target_gap:.1f} percentage points ahead of expected run-rate.")

        if overdue_followups > 0:
            risk_drivers.append(f"{overdue_followups} follow-ups are overdue.")
        
        if sla_breach_count > 0:
            risk_drivers.append(f"{sla_breach_count} high-value leads have breached SLA.")

        if pipeline_coverage < 3.0 and remaining_target > 0:
            risk_drivers.append(f"Pipeline coverage ({pipeline_coverage}x) is below 3.0x target benchmark.")

        if achievement_pct >= 120.0:
            positive_drivers.append(f"RM achieved {achievement_pct:.1f}% of target.")
        
        if calls_count >= 30:
            positive_drivers.append(f"RM completed high volume of phone calls ({calls_count}).")

        if pipeline_coverage >= 3.0:
            positive_drivers.append(f"Pipeline coverage is {pipeline_coverage}x remaining target.")

        return RMPerformanceResponse(
            rm_id=rm.id,
            rm_name=rm.username,
            period=datetime.utcnow().strftime("%Y-%m"),
            target=target_val,
            achieved=achieved_val,
            achievement_percentage=achievement_pct,
            expected_run_rate=expected_run_rate,
            target_gap=target_gap,
            conversion_rate=conversion_rate,
            pipeline_value=pipeline_value,
            weighted_pipeline=weighted_pipeline,
            remaining_opportunity=remaining_opportunity,
            remaining_target=remaining_target,
            pipeline_coverage=pipeline_coverage,
            calls_completed=calls_count,
            meetings_completed=meetings_count,
            followups_completed=followups_count,
            overdue_followups=overdue_followups,
            sla_breach_count=sla_breach_count,
            high_value_opportunities=high_value_opportunities,
            untouched_high_intent_leads=untouched_high_intent_leads,
            average_lead_ageing=avg_age_days,
            benchmark=benchmark_eval,
            risk_drivers=risk_drivers,
            positive_drivers=positive_drivers
        )

    @classmethod
    def get_team_performance(cls, db: Session, team_id: int) -> TeamPerformanceResponse:
        team = db.query(Team).filter(Team.id == team_id).first()
        if not team:
            raise ValueError(f"Team with ID {team_id} not found.")

        members = db.query(User).filter(User.team_id == team_id, User.role == "RM").all()
        if not members:
            # Safe defaults if no members exist
            return TeamPerformanceResponse(
                team_id=team_id,
                team_name=team.name,
                team_target=0.0,
                team_achievement=0.0,
                team_achievement_percentage=0.0,
                expected_run_rate=cls._get_expected_run_rate(),
                target_gap=0.0,
                average_conversion=0.0,
                total_pipeline=0.0,
                total_weighted_pipeline=0.0,
                overdue_follow_ups=0,
                sla_breach_count=0,
                rm_rankings=[],
                top_performers=[],
                at_risk_rms=[]
            )

        # Team aggregates
        team_target = 0.0
        team_achievement = 0.0
        total_pipeline = 0.0
        total_weighted_pipeline = 0.0
        overdue_follow_ups = 0
        sla_breach_count = 0
        conversions = []

        rankings: List[RMRanking] = []

        for rm in members:
            perf = cls.get_rm_performance(db, rm.id)
            team_target += perf.target
            team_achievement += perf.achieved
            total_pipeline += perf.pipeline_value
            total_weighted_pipeline += perf.weighted_pipeline
            overdue_follow_ups += perf.overdue_followups
            sla_breach_count += perf.sla_breach_count
            conversions.append(perf.conversion_rate)

            rankings.append(RMRanking(
                rm_id=rm.id,
                rm_name=rm.username,
                target=perf.target,
                achieved=perf.achieved,
                remaining_target=perf.remaining_target,
                achievement_percentage=perf.achievement_percentage,
                conversion_rate=perf.conversion_rate,
                pipeline_value=perf.pipeline_value,
                weighted_pipeline=perf.weighted_pipeline,
                overdue_followups=perf.overdue_followups,
                status="On Track" if perf.achievement_percentage >= cls._get_expected_run_rate() else "At Risk"
            ))

        # Sort rankings: Achievement Percentage (Descending) as default metric
        rankings.sort(key=lambda r: r.achievement_percentage, reverse=True)

        team_ach_pct = round((team_achievement / team_target * 100.0), 2) if team_target > 0 else 0.0
        expected_run_rate = cls._get_expected_run_rate()
        target_gap = round(team_ach_pct - expected_run_rate, 2)
        avg_conversion = round(sum(conversions) / len(conversions), 2) if conversions else 0.0

        # High achievements/At risk
        top_performers = [r.rm_name for r in rankings if r.achievement_percentage >= expected_run_rate]
        at_risk_rms = [r.rm_name for r in rankings if r.achievement_percentage < expected_run_rate - 10]

        return TeamPerformanceResponse(
            team_id=team_id,
            team_name=team.name,
            team_target=team_target,
            team_achievement=team_achievement,
            team_achievement_percentage=team_ach_pct,
            expected_run_rate=expected_run_rate,
            target_gap=target_gap,
            average_conversion=avg_conversion,
            total_pipeline=total_pipeline,
            total_weighted_pipeline=total_weighted_pipeline,
            overdue_follow_ups=overdue_follow_ups,
            sla_breach_count=sla_breach_count,
            rm_rankings=rankings,
            top_performers=top_performers,
            at_risk_rms=at_risk_rms
        )

    @classmethod
    def get_manager_alerts(cls, db: Session, manager_id: Optional[int] = None) -> List[ManagerAlertResponse]:
        """
        Scans RMs and triggers manager alerts based on strict rules logic.
        Exposes TARGET_LAG, SLA_RISK, LOW_CONVERSION, LOW_PIPELINE, OVERDUE_FOLLOWUPS, HIGH_INTENT_UNTOUCHED.
        """
        # Determine subordinate scope
        rms = []
        if manager_id:
            # Find teams managed by this user
            managed_teams = db.query(Team).filter(Team.manager_id == manager_id).all()
            team_ids = [t.id for t in managed_teams]
            rms = db.query(User).filter(User.team_id.in_(team_ids), User.role == "RM").all()
        else:
            rms = db.query(User).filter(User.role == "RM").all()

        alerts: List[ManagerAlertResponse] = []
        expected_run_rate = cls._get_expected_run_rate()

        for rm in rms:
            perf = cls.get_rm_performance(db, rm.id)

            # 1. Target Lag Alert
            if perf.target_gap < -10.0:
                alerts.append(ManagerAlertResponse(
                    type="TARGET_LAG",
                    severity="HIGH" if perf.target_gap < -15.0 else "MEDIUM",
                    rm_id=rm.id,
                    rm_name=rm.username,
                    current=perf.achievement_percentage,
                    expected=perf.expected_run_rate,
                    gap=perf.target_gap,
                    reason=f"Achievement is {abs(perf.target_gap):.1f} percentage points below expected run-rate.",
                    recommended_focus="Prioritize high-value open opportunities and review pipeline coverage."
                ))

            # 2. SLA Risk Alert
            if perf.sla_breach_count > 0:
                alerts.append(ManagerAlertResponse(
                    type="SLA_RISK",
                    severity="HIGH",
                    rm_id=rm.id,
                    rm_name=rm.username,
                    current=float(perf.sla_breach_count),
                    expected=0.0,
                    gap=float(perf.sla_breach_count),
                    reason=f"{perf.sla_breach_count} lead(s) breached contact SLA deadline.",
                    recommended_focus="Instruct RM to contact the breached lead immediately."
                ))

            # 3. Low Conversion Alert (e.g. conversion < 20%)
            if perf.conversion_rate < 20.0 and perf.target > 0:
                alerts.append(ManagerAlertResponse(
                    type="LOW_CONVERSION",
                    severity="MEDIUM",
                    rm_id=rm.id,
                    rm_name=rm.username,
                    current=perf.conversion_rate,
                    expected=20.0,
                    gap=perf.conversion_rate - 20.0,
                    reason=f"Conversion rate is {perf.conversion_rate:.1f}% which is below the 20% team minimum.",
                    recommended_focus="Examine lead staging pipeline and conversion bottlenecks."
                ))

            # 4. Low Pipeline Alert (e.g. coverage < 3x target)
            remaining = max(0.0, perf.target - perf.achieved)
            if perf.pipeline_coverage < 3.0 and remaining > 0:
                alerts.append(ManagerAlertResponse(
                    type="LOW_PIPELINE",
                    severity="MEDIUM",
                    rm_id=rm.id,
                    rm_name=rm.username,
                    current=perf.pipeline_coverage,
                    expected=3.0,
                    gap=perf.pipeline_coverage - 3.0,
                    reason=f"Pipeline coverage ({perf.pipeline_coverage}x) is below the 3.0x required factor.",
                    recommended_focus="Initiate prospecting and marketing campaigns to build pipeline."
                ))

            # 5. Overdue Follow-ups
            if perf.overdue_followups > 3:
                alerts.append(ManagerAlertResponse(
                    type="OVERDUE_FOLLOWUPS",
                    severity="HIGH" if perf.overdue_followups > 5 else "MEDIUM",
                    rm_id=rm.id,
                    rm_name=rm.username,
                    current=float(perf.overdue_followups),
                    expected=0.0,
                    gap=float(perf.overdue_followups),
                    reason=f"RM has {perf.overdue_followups} overdue follow-up tasks.",
                    recommended_focus="Follow up with RM to clear pending overdue contacts."
                ))

            # 6. Untouched High Intent
            if perf.untouched_high_intent_leads > 0:
                alerts.append(ManagerAlertResponse(
                    type="HIGH_INTENT_UNTOUCHED",
                    severity="HIGH",
                    rm_id=rm.id,
                    rm_name=rm.username,
                    current=float(perf.untouched_high_intent_leads),
                    expected=0.0,
                    gap=float(perf.untouched_high_intent_leads),
                    reason=f"{perf.untouched_high_intent_leads} high-intent lead(s) require RM response.",
                    recommended_focus="Action correlated high-intent tasks immediately."
                ))

        return alerts

    @classmethod
    def get_manager_achievements(cls, db: Session, manager_id: Optional[int] = None) -> List[ManagerAchievementResponse]:
        """
        Identifies positive subordinate achievements (milestones, best rates, wins).
        """
        rms = []
        if manager_id:
            managed_teams = db.query(Team).filter(Team.manager_id == manager_id).all()
            team_ids = [t.id for t in managed_teams]
            rms = db.query(User).filter(User.team_id.in_(team_ids), User.role == "RM").all()
        else:
            rms = db.query(User).filter(User.role == "RM").all()

        achievements: List[ManagerAchievementResponse] = []

        # Find best conversion rate
        best_conversion = 0.0
        best_rm = None

        for rm in rms:
            perf = cls.get_rm_performance(db, rm.id)

            # 1. Target achievement milestone
            if perf.achievement_percentage >= 120.0:
                achievements.append(ManagerAchievementResponse(
                    rm_id=rm.id,
                    rm_name=rm.username,
                    achievement_type="EXCEEDED_TARGET",
                    reason=f"RM has achieved {perf.achievement_percentage:.1f}% of monthly target.",
                    detected_at=datetime.utcnow()
                ))

            # Track for best conversion
            if perf.conversion_rate > best_conversion:
                best_conversion = perf.conversion_rate
                best_rm = rm

            # 2. Exceptional Pipeline Coverage
            if perf.pipeline_coverage >= 5.0:
                achievements.append(ManagerAchievementResponse(
                    rm_id=rm.id,
                    rm_name=rm.username,
                    achievement_type="STRONG_PIPELINE",
                    reason=f"RM has built exceptional pipeline coverage of {perf.pipeline_coverage:.1f}x.",
                    detected_at=datetime.utcnow()
                ))

        # Best conversion award
        if best_rm and best_conversion > 0.0:
            achievements.append(ManagerAchievementResponse(
                rm_id=best_rm.id,
                rm_name=best_rm.username,
                achievement_type="BEST_CONVERSION",
                reason=f"RM achieved the best conversion rate among subordinates ({best_conversion:.1f}%).",
                detected_at=datetime.utcnow()
            ))

        return achievements
