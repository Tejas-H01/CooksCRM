from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.engine.rule_engine import BaseRule
from app.models.models import Event, Action, Lead
from app.core.config import settings
from app.engine.priority_engine import PriorityEngine

class SLABreachRule(BaseRule):
    @property
    def name(self) -> str:
        return "SLA_BREACH_RULE"

    async def evaluate(self, db: Session, event: Event) -> List[Action]:
        actions = []
        if event.entity_type.upper() != "LEAD":
            return actions

        try:
            lead_id = int(event.entity_id)
        except ValueError:
            return actions

        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead or not lead.assigned_rm_id:
            return actions

        # Check conditions
        val = float(lead.potential_value or 0)
        is_high_value = val >= settings.HIGH_VALUE_THRESHOLD
        no_contact = lead.last_contact is None
        sla_breached = lead.sla_deadline is not None and datetime.utcnow() > lead.sla_deadline
        is_open = lead.status.upper() == "OPEN"

        if is_high_value and no_contact and sla_breached and is_open:
            reason = f"High-value lead worth ₹{val:,.2f} has not been contacted and the configured SLA has been breached."

            # Calculate priority
            opportunity_value_score = min(100.0, (val / 1000000.0) * 100.0)
            priority, score, factors = PriorityEngine.calculate_priority(
                urgency=100.0,
                opportunity_value=opportunity_value_score,
                sla_risk=100.0,
                customer_importance=80.0,
                intent=50.0
            )

            action = Action(
                rm_id=lead.assigned_rm_id,
                customer_id=lead.customer_id,
                lead_id=lead.id,
                action_type="ESCALATE_SLA",
                priority=priority,
                score=score,
                factors=factors,
                title="Contact high-value lead immediately",
                description="SLA deadline breached for a high-value lead.",
                reason=reason,
                source_event_id=event.id,
                status="PENDING",
                due_at=datetime.utcnow()
            )
            actions.append(action)

        return actions
