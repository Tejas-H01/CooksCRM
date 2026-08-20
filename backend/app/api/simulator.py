import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.event import EventCreate, EventType
from app.services.event_service import ingest_event
from app.models.models import Lead, Customer, Target, User

router = APIRouter()

@router.post("/events/simulate/{scenario}", status_code=status.HTTP_201_CREATED)
async def simulate_scenario(scenario: str, db: Session = Depends(get_db)):
    scenario = scenario.lower()

    if scenario == "sla_breach":
        lead = db.query(Lead).filter(Lead.id == 2).first()
        if not lead:
            raise HTTPException(status_code=404, detail="Seed Lead with ID 2 not found.")
        lead.potential_value = 800000.00
        lead.sla_deadline = datetime.utcnow() - timedelta(hours=2)
        lead.last_contact = None
        lead.status = "OPEN"
        db.commit()

        event_data = EventCreate(
            event_type=EventType.LEAD_NOT_CONTACTED,
            entity_type="LEAD",
            entity_id="2",
            payload={"reason": "SLA breach check"},
            idempotency_key=f"sim_sla_breach_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
        return {"status": "success", "message": "Simulated LEAD_NOT_CONTACTED event for Lead 2"}

    elif scenario == "payin_opportunity":
        cust = db.query(Customer).filter(Customer.id == 1).first()
        if not cust:
            raise HTTPException(status_code=404, detail="Seed Customer with ID 1 not found.")

        db.query(Lead).filter(
            Lead.customer_id == 1,
            Lead.next_follow_up > datetime.utcnow()
        ).delete()
        db.commit()

        event_data = EventCreate(
            event_type=EventType.PAYIN_RECEIVED,
            entity_type="CUSTOMER",
            entity_id="1",
            payload={"amount": 750000.00, "product": "Mutual Fund"},
            idempotency_key=f"sim_payin_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
        return {"status": "success", "message": "Simulated PAYIN_RECEIVED event for Customer 1"}

    elif scenario == "high_intent":
        base_id = uuid.uuid4()
        e1 = EventCreate(
            event_type=EventType.WEBSITE_VISIT,
            entity_type="CUSTOMER",
            entity_id="1",
            payload={"page": "portfolio_overview"},
            idempotency_key=f"sim_intent_1_{base_id}"
        )
        e2 = EventCreate(
            event_type=EventType.PRODUCT_ENQUIRY,
            entity_type="CUSTOMER",
            entity_id="1",
            payload={"product": "Mutual Funds"},
            idempotency_key=f"sim_intent_2_{base_id}"
        )
        e3 = EventCreate(
            event_type=EventType.CAMPAIGN_RESPONSE,
            entity_type="CUSTOMER",
            entity_id="1",
            payload={"campaign": "Wealth Plus"},
            idempotency_key=f"sim_intent_3_{base_id}"
        )

        await ingest_event(db, e1)
        await ingest_event(db, e2)
        await ingest_event(db, e3)

        return {"status": "success", "message": "Simulated correlated high-intent events for Customer 1"}

    elif scenario == "target_gap":
        rm = db.query(User).filter(User.username == "rm_alice").first()
        if not rm:
            raise HTTPException(status_code=404, detail="RM Alice not found.")

        target = db.query(Target).filter(Target.rm_id == rm.id).first()
        if target:
            target.target_value = 200000.00
            target.achieved_value = 122000.00
            db.commit()

        event_data = EventCreate(
            event_type=EventType.TARGET_UPDATED,
            entity_type="USER",
            entity_id=str(rm.id),
            payload={"updated_fields": ["achieved_value"]},
            idempotency_key=f"sim_target_gap_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
        return {"status": "success", "message": "Simulated TARGET_UPDATED event for Alice (61% achievement)"}

    elif scenario == "special_achievement":
        rm = db.query(User).filter(User.username == "rm_alice").first()
        if not rm:
            raise HTTPException(status_code=404, detail="RM Alice not found.")

        target = db.query(Target).filter(Target.rm_id == rm.id).first()
        if target:
            target.target_value = 200000.00
            target.achieved_value = 250000.00
            db.commit()

        event_data = EventCreate(
            event_type=EventType.TARGET_UPDATED,
            entity_type="USER",
            entity_id=str(rm.id),
            payload={"updated_fields": ["achieved_value"]},
            idempotency_key=f"sim_special_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
        return {"status": "success", "message": "Simulated TARGET_UPDATED event triggering Special Achievement"}

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown simulation scenario '{scenario}'"
        )
