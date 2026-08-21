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
        lead = db.query(Lead).filter(Lead.status == "OPEN").first()
        if not lead:
            lead = db.query(Lead).first()
        if not lead:
            raise HTTPException(status_code=404, detail="No Lead found in database for SLA breach scenario.")
        lead.potential_value = 800000.00
        lead.sla_deadline = datetime.utcnow() - timedelta(hours=2)
        lead.last_contact = None
        lead.status = "OPEN"
        db.commit()

        event_data = EventCreate(
            event_type=EventType.LEAD_NOT_CONTACTED,
            entity_type="LEAD",
            entity_id=str(lead.id),
            payload={"reason": "SLA breach check"},
            idempotency_key=f"sim_sla_breach_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
        return {"status": "success", "message": f"Simulated LEAD_NOT_CONTACTED event for Lead {lead.id}"}

    elif scenario == "payin_opportunity":
        cust = db.query(Customer).filter(Customer.assigned_rm_id != None).first()
        if not cust:
            cust = db.query(Customer).first()
        if not cust:
            raise HTTPException(status_code=404, detail="No Customer found in database for Pay-in scenario.")

        db.query(Lead).filter(
            Lead.customer_id == cust.id,
            Lead.next_follow_up > datetime.utcnow()
        ).delete()
        db.commit()

        event_data = EventCreate(
            event_type=EventType.PAYIN_RECEIVED,
            entity_type="CUSTOMER",
            entity_id=str(cust.id),
            payload={"amount": 750000.00, "product": "Mutual Fund"},
            idempotency_key=f"sim_payin_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
        return {"status": "success", "message": f"Simulated PAYIN_RECEIVED event for Customer {cust.id}"}

    elif scenario == "high_intent":
        cust = db.query(Customer).filter(Customer.assigned_rm_id != None).first()
        if not cust:
            cust = db.query(Customer).first()
        if not cust:
            raise HTTPException(status_code=404, detail="No Customer found in database for High Intent scenario.")

        cid_str = str(cust.id)
        base_id = uuid.uuid4()
        e1 = EventCreate(
            event_type=EventType.WEBSITE_VISIT,
            entity_type="CUSTOMER",
            entity_id=cid_str,
            payload={"page": "portfolio_overview"},
            idempotency_key=f"sim_intent_1_{base_id}"
        )
        e2 = EventCreate(
            event_type=EventType.PRODUCT_ENQUIRY,
            entity_type="CUSTOMER",
            entity_id=cid_str,
            payload={"product": "Mutual Funds"},
            idempotency_key=f"sim_intent_2_{base_id}"
        )
        e3 = EventCreate(
            event_type=EventType.CAMPAIGN_RESPONSE,
            entity_type="CUSTOMER",
            entity_id=cid_str,
            payload={"campaign": "Wealth Plus"},
            idempotency_key=f"sim_intent_3_{base_id}"
        )

        await ingest_event(db, e1)
        await ingest_event(db, e2)
        await ingest_event(db, e3)

        return {"status": "success", "message": f"Simulated correlated high-intent events for Customer {cust.id}"}

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

@router.get("/simulator/stats")
async def get_simulator_stats():
    from app.core.queue import event_queue_manager
    from app.engine.simulator_engine import simulator_engine
    stats = await event_queue_manager.get_stats()
    return {
        "is_simulator_running": simulator_engine.is_running,
        **stats
    }

@router.post("/simulator/start")
async def start_simulator():
    from app.engine.simulator_engine import simulator_engine
    await simulator_engine.start()
    return {"status": "success", "message": "Simulator engine started successfully."}

@router.post("/simulator/stop")
async def stop_simulator():
    from app.engine.simulator_engine import simulator_engine
    await simulator_engine.stop()
    return {"status": "success", "message": "Simulator engine stopped successfully."}

@router.post("/simulator/journey/{blueprint_name}")
async def trigger_journey_endpoint(blueprint_name: str, customer_id: str = "1"):
    from app.engine.simulator_engine import simulator_engine
    try:
        await simulator_engine.trigger_journey(blueprint_name, customer_id)
        return {"status": "success", "message": f"Journey '{blueprint_name}' triggered for Customer ID {customer_id}"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
