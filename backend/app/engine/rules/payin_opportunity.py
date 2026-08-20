from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.engine.rule_engine import BaseRule
from app.models.models import Event, Action, Customer, Lead
from app.core.config import settings
from app.engine.priority_engine import PriorityEngine

class PayinOpportunityRule(BaseRule):
    @property
    def name(self) -> str:
        return "PAYIN_OPPORTUNITY_RULE"

    async def evaluate(self, db: Session, event: Event) -> List[Action]:
        actions = []
        if event.event_type != "PAYIN_RECEIVED" or event.entity_type.upper() != "CUSTOMER":
            return actions

        try:
            customer_id = int(event.entity_id)
        except ValueError:
            return actions

        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer or not customer.assigned_rm_id:
            return actions

        payload = event.payload or {}
        try:
            amount = float(payload.get("amount", 0))
        except (ValueError, TypeError):
            return actions

        if amount < settings.SIGNIFICANT_PAYIN_THRESHOLD:
            return actions

        # Check for open leads with a future follow-up activity scheduled
        has_future_followup = db.query(Lead).filter(
            Lead.customer_id == customer.id,
            Lead.next_follow_up > datetime.utcnow(),
            Lead.status == "OPEN"
        ).first() is not None

        if not has_future_followup:
            reason = f"Customer received a significant pay-in of ₹{amount:,.2f} but no follow-up activity is scheduled."

            opportunity_value_score = min(100.0, (amount / 1000000.0) * 100.0)
            priority, score, factors = PriorityEngine.calculate_priority(
                urgency=70.0,
                opportunity_value=opportunity_value_score,
                sla_risk=30.0,
                customer_importance=80.0,
                intent=90.0
            )

            action = Action(
                rm_id=customer.assigned_rm_id,
                customer_id=customer.id,
                lead_id=None,
                action_type="OPPORTUNITY_AT_RISK",
                priority=priority,
                score=score,
                factors=factors,
                title="Schedule follow-up on significant pay-in",
                description="Significant pay-in received but no follow-up scheduled.",
                reason=reason,
                source_event_id=event.id,
                status="PENDING",
                due_at=datetime.utcnow()
            )
            actions.append(action)

        return actions
