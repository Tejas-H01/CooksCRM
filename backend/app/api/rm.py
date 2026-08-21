import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.models.models import User, Customer, Lead, Action
from app.api.auth import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.action import ActionResponse, ScheduleItemResponse
from app.schemas.performance import RMPerformanceResponse
from app.schemas.customer import CustomerCreateRequest, CustomerResponse
from app.schemas.lead import OpportunityCreateRequest, OpportunityResponse, OpportunitySuggestionResponse
from app.schemas.event import EventCreate, EventType
from app.services.event_service import ingest_event
from app.services.performance_service import PerformanceService
from app.services.action_service import ActionService

logger = logging.getLogger(__name__)

router = APIRouter()

def require_rm(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "RM":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: RM role required"
        )
    return current_user

@router.get("/rm/me", response_model=UserResponse)
def get_rm_me(current_rm: User = Depends(require_rm)):
    return current_rm

@router.get("/rm/me/customers", response_model=List[CustomerResponse])
def get_rm_customers(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return db.query(Customer).filter(Customer.assigned_rm_id == current_rm.id).all()

@router.post("/rm/me/customers", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_rm_customer(
    body: CustomerCreateRequest,
    current_rm: User = Depends(require_rm),
    db: Session = Depends(get_db)
):
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required.")
        
    new_customer = Customer(
        name=body.name.strip(),
        email=body.email.strip() if body.email and body.email.strip() else None,
        phone=body.phone.strip() if body.phone and body.phone.strip() else None,
        segment=body.segment if body.segment and body.segment.strip() else "Retail",
        assigned_rm_id=current_rm.id,
        status="ACTIVE",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    logger.info(f"RM {current_rm.id} created new customer ID {new_customer.id} ('{new_customer.name}')")
    return new_customer

@router.get("/rm/me/leads")
def get_rm_leads(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return db.query(Lead).filter(Lead.assigned_rm_id == current_rm.id).all()

@router.get("/rm/me/actions", response_model=List[ActionResponse])
def get_rm_actions(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return ActionService.get_actions(db, rm_id=current_rm.id)

@router.get("/rm/me/schedule", response_model=List[ScheduleItemResponse])
def get_rm_schedule(
    date: Optional[str] = None,
    current_rm: User = Depends(require_rm),
    db: Session = Depends(get_db)
):
    return ActionService.get_schedule_for_rm(db, rm_id=current_rm.id, date_str=date)

@router.get("/rm/me/performance", response_model=RMPerformanceResponse)
def get_rm_performance(current_rm: User = Depends(require_rm), db: Session = Depends(get_db)):
    return PerformanceService.get_rm_performance(db, current_rm.id)

@router.get("/rm/me/opportunity-suggestions", response_model=List[OpportunitySuggestionResponse])
def get_opportunity_suggestions(
    current_rm: User = Depends(require_rm),
    db: Session = Depends(get_db)
):
    suggestions = db.query(Lead).filter(
        Lead.assigned_rm_id == current_rm.id,
        Lead.status == "SUGGESTED"
    ).order_by(Lead.created_at.desc()).all()

    result = []
    for s in suggestions:
        resp = OpportunitySuggestionResponse.model_validate(s)
        if s.customer:
            resp.customer_name = s.customer.name
        result.append(resp)
    return result

@router.post("/rm/me/opportunity-suggestions/{lead_id}/accept", response_model=OpportunityResponse)
async def accept_opportunity_suggestion(
    lead_id: int,
    current_rm: User = Depends(require_rm),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Opportunity suggestion not found.")
    if lead.assigned_rm_id != current_rm.id:
        raise HTTPException(status_code=403, detail="Unauthorized to accept another RM's suggestion.")
    
    lead.status = "OPEN"
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)

    try:
        event_data = EventCreate(
            event_type=EventType.OPPORTUNITY_CREATED,
            entity_type="LEAD",
            entity_id=str(lead.id),
            actor_id=str(current_rm.id),
            payload={
                "customer_id": lead.customer_id,
                "name": lead.name,
                "potential_value": float(lead.potential_value or 0),
                "action": "ACCEPTED_SUGGESTION"
            },
            idempotency_key=f"opp_created_accept_{lead.id}_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
    except Exception as e:
        logger.warning(f"Failed to emit OPPORTUNITY_CREATED event: {e}")

    return lead

@router.post("/rm/me/opportunity-suggestions/{lead_id}/dismiss", response_model=OpportunityResponse)
async def dismiss_opportunity_suggestion(
    lead_id: int,
    current_rm: User = Depends(require_rm),
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Opportunity suggestion not found.")
    if lead.assigned_rm_id != current_rm.id:
        raise HTTPException(status_code=403, detail="Unauthorized to dismiss another RM's suggestion.")
    
    lead.status = "DISMISSED"
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)

    try:
        event_data = EventCreate(
            event_type=EventType.OPPORTUNITY_DISMISSED,
            entity_type="LEAD",
            entity_id=str(lead.id),
            actor_id=str(current_rm.id),
            payload={
                "customer_id": lead.customer_id,
                "name": lead.name,
                "reason": "Dismissed by RM"
            },
            idempotency_key=f"opp_dismissed_{lead.id}_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
    except Exception as e:
        logger.warning(f"Failed to emit OPPORTUNITY_DISMISSED event: {e}")

    return lead

@router.post("/rm/me/opportunities", response_model=OpportunityResponse, status_code=status.HTTP_201_CREATED)
async def create_opportunity(
    body: OpportunityCreateRequest,
    current_rm: User = Depends(require_rm),
    db: Session = Depends(get_db)
):
    customer = db.query(Customer).filter(Customer.id == body.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer with ID {body.customer_id} not found.")
    if customer.assigned_rm_id != current_rm.id:
        raise HTTPException(status_code=403, detail="Unauthorized to create opportunity for another RM's customer.")

    new_lead = Lead(
        customer_id=customer.id,
        assigned_rm_id=current_rm.id,
        name=body.name,
        email=customer.email,
        phone=customer.phone,
        source="MANUAL_RM_ENTRY",
        stage=body.stage,
        potential_value=body.potential_value,
        actual_value=0.00,
        probability=body.probability,
        expected_close_date=body.expected_close_date,
        notes=body.notes,
        status="OPEN",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)

    try:
        event_data = EventCreate(
            event_type=EventType.OPPORTUNITY_CREATED,
            entity_type="LEAD",
            entity_id=str(new_lead.id),
            actor_id=str(current_rm.id),
            payload={
                "customer_id": new_lead.customer_id,
                "name": new_lead.name,
                "potential_value": float(new_lead.potential_value or 0),
                "source": "MANUAL_ENTRY"
            },
            idempotency_key=f"opp_created_manual_{new_lead.id}_{uuid.uuid4()}"
        )
        await ingest_event(db, event_data)
    except Exception as e:
        logger.warning(f"Failed to emit OPPORTUNITY_CREATED event: {e}")

    return new_lead

