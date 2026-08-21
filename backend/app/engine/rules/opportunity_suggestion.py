from datetime import datetime, timedelta
from typing import List
from sqlalchemy.orm import Session
from app.engine.rule_engine import BaseRule
from app.models.models import Event, Lead, Customer
from app.core.config import settings

class OpportunitySuggestionRule(BaseRule):
    @property
    def name(self) -> str:
        return "OPPORTUNITY_SUGGESTION_RULE"

    async def evaluate(self, db: Session, event: Event) -> List[Lead]:
        suggestions = []

        if event.entity_type.upper() != "CUSTOMER":
            return suggestions

        try:
            customer_id = int(event.entity_id)
        except (ValueError, TypeError):
            return suggestions

        customer = db.query(Customer).filter(Customer.id == customer_id).first()
        if not customer or not customer.assigned_rm_id:
            return suggestions

        # Meaningful intent signals
        high_intent_types = {
            "PRODUCT_ENQUIRY", "APPLICATION_STARTED", "APPLICATION_COMPLETED",
            "PURCHASE_INTENT", "UPSELL_SIGNAL", "CROSS_SELL_SIGNAL",
            "REPEAT_PURCHASE_SIGNAL", "CAMPAIGN_RESPONSE"
        }

        if event.event_type not in high_intent_types:
            # Check accumulated intent signals (e.g. 2+ interactions within window)
            window_start = (event.occurred_at or datetime.utcnow()) - timedelta(minutes=settings.HIGH_INTENT_WINDOW_MINUTES)
            accumulated_events = db.query(Event).filter(
                Event.entity_type == event.entity_type,
                Event.entity_id == event.entity_id,
                Event.event_type.in_(["WEBSITE_VISIT", "PRODUCT_VIEW", "PRODUCT_ENQUIRY"]),
                Event.occurred_at >= window_start
            ).count()

            if accumulated_events < 3:
                return suggestions

        # Check if an existing open or suggested lead already exists for this customer
        payload = event.payload or {}
        product_name = payload.get("product") or payload.get("campaign") or "Portfolio Expansion"

        existing_lead = db.query(Lead).filter(
            Lead.customer_id == customer.id,
            Lead.status.in_(["OPEN", "SUGGESTED"])
        ).first()

        if existing_lead:
            # Don't create duplicate suggestion if an open/suggested lead already exists
            return suggestions

        # Extract potential value from payload or default to 100k
        val = float(payload.get("amount") or payload.get("price") or payload.get("value") or 100000.00)

        suggestion = Lead(
            customer_id=customer.id,
            assigned_rm_id=customer.assigned_rm_id,
            name=f"{customer.name} - {product_name}",
            email=customer.email,
            phone=customer.phone,
            source=event.event_type,
            stage="QUALIFIED",
            potential_value=val,
            actual_value=0.00,
            probability=50,
            expected_close_date=datetime.utcnow() + timedelta(days=30),
            status="SUGGESTED",
            reason=f"High-intent signal ({event.event_type}) detected from {customer.name}.",
            notes=f"System generated suggestion from event {event.id}",
            trigger_event_id=event.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        suggestions.append(suggestion)
        return suggestions
