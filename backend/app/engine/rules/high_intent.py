from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.engine.rule_engine import BaseRule
from app.models.models import Event, Action, Customer, Lead
from app.core.config import settings
from app.engine.priority_engine import PriorityEngine

class HighIntentRule(BaseRule):
    @property
    def name(self) -> str:
        return "HIGH_INTENT_RULE"

    async def evaluate(self, db: Session, event: Event) -> List[Action]:
        actions = []
        high_intent_types = {"WEBSITE_VISIT", "PRODUCT_ENQUIRY", "CAMPAIGN_RESPONSE"}
        if event.event_type not in high_intent_types:
            return actions

        entity_type = event.entity_type.upper()
        entity_id = event.entity_id

        rm_id = None
        customer_id = None
        lead_id = None

        if entity_type == "CUSTOMER":
            try:
                cust_id_int = int(entity_id)
                customer = db.query(Customer).filter(Customer.id == cust_id_int).first()
                if customer:
                    rm_id = customer.assigned_rm_id
                    customer_id = customer.id
            except ValueError:
                pass
        elif entity_type == "LEAD":
            try:
                ld_id_int = int(entity_id)
                lead = db.query(Lead).filter(Lead.id == ld_id_int).first()
                if lead:
                    rm_id = lead.assigned_rm_id
                    lead_id = lead.id
                    customer_id = lead.customer_id
            except ValueError:
                pass

        if not rm_id:
            return actions

        window_start = event.occurred_at - timedelta(minutes=settings.HIGH_INTENT_WINDOW_MINUTES)

        events_in_window = db.query(Event).filter(
            Event.entity_type == event.entity_type,
            Event.entity_id == event.entity_id,
            Event.event_type.in_(list(high_intent_types)),
            Event.occurred_at >= window_start,
            Event.occurred_at <= event.occurred_at
        ).all()

        if len(events_in_window) < 2:
            return actions

        oldest_event_time = min(e.occurred_at for e in events_in_window)
        followup_events = {"CALL_COMPLETED", "MEETING_COMPLETED", "LEAD_CONTACTED", "FOLLOWUP_COMPLETED"}

        recent_followup = db.query(Event).filter(
            Event.entity_type == event.entity_type,
            Event.entity_id == event.entity_id,
            Event.event_type.in_(list(followup_events)),
            Event.occurred_at >= oldest_event_time
        ).first()

        if not recent_followup:
            types_found = sorted(list(set(e.event_type for e in events_in_window)))
            reason = f"Multiple high-intent signals ({', '.join(types_found)}) detected for this entity within a {settings.HIGH_INTENT_WINDOW_MINUTES}-minute window, with no RM follow-up."

            priority, score, factors = PriorityEngine.calculate_priority(
                urgency=80.0,
                opportunity_value=60.0,
                sla_risk=50.0,
                customer_importance=70.0,
                intent=95.0
            )

            action = Action(
                rm_id=rm_id,
                customer_id=customer_id,
                lead_id=lead_id,
                action_type="HIGH_INTENT",
                priority=priority,
                score=score,
                factors=factors,
                title="Respond to high-intent activity",
                description="High-intent events correlated, follow-up required.",
                reason=reason,
                source_event_id=event.id,
                status="PENDING",
                due_at=datetime.utcnow() + timedelta(hours=2)
            )
            actions.append(action)

        return actions
