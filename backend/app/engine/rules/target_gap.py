from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.engine.rule_engine import BaseRule
from app.models.models import Event, Action, User, Target, Benchmark
from app.engine.priority_engine import PriorityEngine

class TargetGapRule(BaseRule):
    @property
    def name(self) -> str:
        return "TARGET_GAP_RULE"

    async def evaluate(self, db: Session, event: Event) -> List[Action]:
        actions = []
        valid_events = {"TARGET_UPDATED", "BENCHMARK_UPDATED", "CONVERSION_COMPLETED"}
        if event.event_type not in valid_events:
            return actions

        rm_id = None
        if event.entity_type.upper() == "USER":
            try:
                rm_id = int(event.entity_id)
            except ValueError:
                pass

        rms_to_check = []
        if rm_id:
            rm = db.query(User).filter(User.id == rm_id, User.role == "RM").first()
            if rm:
                rms_to_check = [rm]
        else:
            rms_to_check = db.query(User).filter(User.role == "RM").all()

        benchmark = db.query(Benchmark).filter(
            Benchmark.metric == "conversion_rate"
        ).first()
        expected_run_rate = float(benchmark.value) if benchmark else 78.0

        for rm in rms_to_check:
            targets = db.query(Target).filter(Target.rm_id == rm.id).all()
            for target in targets:
                if not target.target_value or target.target_value <= 0:
                    continue

                achieved = float(target.achieved_value)
                total = float(target.target_value)
                achievement_pct = (achieved / total) * 100.0

                if achievement_pct < expected_run_rate:
                    gap = achievement_pct - expected_run_rate
                    reason = (
                        f"RM {rm.username} has achieved {achievement_pct:.1f}% of monthly target ({target.product}) "
                        f"when the expected run-rate is {expected_run_rate:.1f}%. Target gap is {gap:.1f} percentage points."
                    )

                    opportunity_value_score = min(100.0, (total / 500000.0) * 100.0)
                    priority, score, factors = PriorityEngine.calculate_priority(
                        urgency=60.0,
                        opportunity_value=opportunity_value_score,
                        sla_risk=20.0,
                        customer_importance=50.0,
                        intent=40.0
                    )

                    action = Action(
                        rm_id=rm.id,
                        customer_id=None,
                        lead_id=None,
                        action_type="TARGET_GAP",
                        priority=priority,
                        score=score,
                        factors=factors,
                        title=f"Address target gap for {target.product}",
                        description=f"RM run-rate is {achievement_pct:.1f}% vs expected {expected_run_rate:.1f}%.",
                        reason=reason,
                        source_event_id=event.id,
                        status="PENDING",
                        due_at=datetime.utcnow()
                    )
                    actions.append(action)

        return actions
