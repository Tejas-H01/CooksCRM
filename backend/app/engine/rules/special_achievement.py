from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.engine.rule_engine import BaseRule
from app.models.models import Event, Action, User, Target
from app.engine.priority_engine import PriorityEngine

class SpecialAchievementRule(BaseRule):
    @property
    def name(self) -> str:
        return "SPECIAL_ACHIEVEMENT_RULE"

    async def evaluate(self, db: Session, event: Event) -> List[Action]:
        actions = []
        if event.event_type not in {"CONVERSION_COMPLETED", "TARGET_UPDATED"}:
            return actions

        rm_id = None
        if event.entity_type.upper() == "USER":
            try:
                rm_id = int(event.entity_id)
            except ValueError:
                pass

        if not rm_id:
            return actions

        rm = db.query(User).filter(User.id == rm_id, User.role == "RM").first()
        if not rm:
            return actions

        # Check: target achievement >= 120%
        has_exceeded_target = False
        targets = db.query(Target).filter(Target.rm_id == rm.id).all()
        for target in targets:
            if not target.target_value or target.target_value <= 0:
                continue

            achieved = float(target.achieved_value)
            total = float(target.target_value)
            achievement_pct = (achieved / total) * 100.0

            if achievement_pct >= 120.0:
                reason = f"RM {rm.username} has achieved {achievement_pct:.1f}% of target ({target.product}) exceeding the 120% milestone."
                has_exceeded_target = True

                priority, score, factors = PriorityEngine.calculate_priority(
                    urgency=30.0,
                    opportunity_value=90.0,
                    sla_risk=10.0,
                    customer_importance=50.0,
                    intent=80.0
                )

                action = Action(
                    rm_id=rm.id,
                    customer_id=None,
                    lead_id=None,
                    action_type="SPECIAL_ACHIEVEMENT",
                    priority=priority,
                    score=score,
                    factors=factors,
                    title="Special Target Achievement",
                    description=f"Exceeded monthly target by achieving {achievement_pct:.1f}%!",
                    reason=reason,
                    source_event_id=event.id,
                    status="PENDING",
                    due_at=datetime.utcnow()
                )
                actions.append(action)

        if has_exceeded_target:
            return actions

        # Check: best conversion rate in team
        if rm.team_id:
            team_members = db.query(User).filter(User.team_id == rm.team_id, User.role == "RM").all()
            if len(team_members) > 1:
                best_achievement = 0.0
                best_rm_id = None

                for member in team_members:
                    member_targets = db.query(Target).filter(Target.rm_id == member.id).all()
                    for t in member_targets:
                        if t.target_value and t.target_value > 0:
                            ach = float(t.achieved_value)
                            tot = float(t.target_value)
                            pct = (ach / tot) * 100.0
                            if pct > best_achievement:
                                best_achievement = pct
                                best_rm_id = member.id

                if best_rm_id == rm.id and best_achievement > 0.0:
                    reason = f"RM {rm.username} achieved the best conversion rate in the team ({best_achievement:.1f}%)."

                    priority, score, factors = PriorityEngine.calculate_priority(
                        urgency=20.0,
                        opportunity_value=85.0,
                        sla_risk=10.0,
                        customer_importance=40.0,
                        intent=70.0
                    )

                    action = Action(
                        rm_id=rm.id,
                        customer_id=None,
                        lead_id=None,
                        action_type="SPECIAL_ACHIEVEMENT",
                        priority=priority,
                        score=score,
                        factors=factors,
                        title="Best Team Conversion Achievement",
                        description=f"Achieved the highest conversion rate in the team ({best_achievement:.1f}%)!",
                        reason=reason,
                        source_event_id=event.id,
                        status="PENDING",
                        due_at=datetime.utcnow()
                    )
                    actions.append(action)

        return actions
