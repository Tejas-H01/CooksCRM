from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Action, Lead
import logging

logger = logging.getLogger(__name__)

class ActionService:
    @staticmethod
    def get_actions(db: Session, rm_id: Optional[int] = None, status: Optional[str] = None) -> List[Action]:
        query = db.query(Action)
        if rm_id is not None:
            query = query.filter(Action.rm_id == rm_id)
        if status is not None:
            query = query.filter(Action.status == status)
        return query.all()

    @staticmethod
    def get_action_by_id(db: Session, action_id: str) -> Optional[Action]:
        return db.query(Action).filter(Action.id == action_id).first()

    @staticmethod
    def create_action(db: Session, action_data: Action) -> Action:
        # Check for duplication:
        # If there is already a PENDING action with same type, rm, customer, and lead
        duplicate = db.query(Action).filter(
            Action.action_type == action_data.action_type,
            Action.rm_id == action_data.rm_id,
            Action.customer_id == action_data.customer_id,
            Action.lead_id == action_data.lead_id,
            Action.status == "PENDING"
        ).first()

        if duplicate:
            logger.info(f"ActionService: Duplicate action ignored. Already exists as PENDING Action {duplicate.id}")
            return duplicate

        db.add(action_data)
        db.commit()
        db.refresh(action_data)
        logger.info(f"ActionService: Created Action {action_data.id} type={action_data.action_type}")
        return action_data

    @staticmethod
    def complete_action(db: Session, action_id: str, outcome: Optional[Dict[str, Any]] = None) -> Optional[Action]:
        action = db.query(Action).filter(Action.id == action_id).first()
        if action:
            action.status = "COMPLETED"
            action.completed_at = datetime.utcnow()
            if outcome is not None:
                action.outcome = outcome
            db.commit()
            db.refresh(action)
            logger.info(f"ActionService: Completed Action {action_id}")
        return action

    @staticmethod
    def snooze_action(db: Session, action_id: str, minutes: int = 60) -> Optional[Action]:
        action = db.query(Action).filter(Action.id == action_id).first()
        if action:
            action.status = "SNOOZED"
            action.due_at = datetime.utcnow() + timedelta(minutes=minutes)
            db.commit()
            db.refresh(action)
            logger.info(f"ActionService: Snoozed Action {action_id} until {action.due_at}")
        return action

    @staticmethod
    def reassign_action(db: Session, action_id: str, new_rm_id: int) -> Optional[Action]:
        action = db.query(Action).filter(Action.id == action_id).first()
        if action:
            action.status = "REASSIGNED"
            action.rm_id = new_rm_id
            db.commit()
            db.refresh(action)
            logger.info(f"ActionService: Reassigned Action {action_id} to RM {new_rm_id}")
        return action

    @staticmethod
    def dismiss_action(db: Session, action_id: str) -> Optional[Action]:
        action = db.query(Action).filter(Action.id == action_id).first()
        if action:
            action.status = "DISMISSED"
            db.commit()
            db.refresh(action)
            logger.info(f"ActionService: Dismissed Action {action_id}")
        return action

    @staticmethod
    def record_outcome(db: Session, action_id: str, outcome: Dict[str, Any]) -> Optional[Action]:
        action = db.query(Action).filter(Action.id == action_id).first()
        if action:
            action.outcome = outcome
            db.commit()
            db.refresh(action)
            logger.info(f"ActionService: Recorded outcome for Action {action_id}")
        return action

    @staticmethod
    def get_schedule_for_rm(db: Session, rm_id: int, date_str: Optional[str] = None) -> List[Dict[str, Any]]:
        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                target_date = datetime.utcnow().date()
        else:
            target_date = datetime.utcnow().date()

        start_dt = datetime.combine(target_date, datetime.min.time())
        end_dt = datetime.combine(target_date, datetime.max.time())

        # Actions due on or before end_dt (due today or overdue pending/in_progress)
        actions = db.query(Action).filter(
            Action.rm_id == rm_id,
            Action.due_at <= end_dt
        ).all()

        schedule_items = []

        for a in actions:
            is_due_today = (start_dt <= a.due_at <= end_dt)
            is_overdue_pending = (a.due_at < start_dt and a.status in ["PENDING", "IN_PROGRESS"])
            
            if is_due_today or is_overdue_pending:
                c_name = a.customer.name if a.customer else (a.lead.name if a.lead else "Customer")
                l_name = a.lead.name if a.lead else None
                formatted_time = a.due_at.strftime("%I:%M %p")
                if is_overdue_pending:
                    formatted_time += " (Overdue)"
                
                schedule_items.append({
                    "id": a.id,
                    "item_type": "ACTION",
                    "action_type": a.action_type,
                    "priority": a.priority,
                    "title": a.title,
                    "description": a.description,
                    "due_at": a.due_at,
                    "formatted_time": formatted_time,
                    "status": a.status,
                    "customer_id": a.customer_id,
                    "customer_name": c_name,
                    "lead_id": a.lead_id,
                    "lead_name": l_name,
                    "rm_id": a.rm_id
                })

        # Open Leads with next_follow_up today
        leads = db.query(Lead).filter(
            Lead.assigned_rm_id == rm_id,
            Lead.status == "OPEN",
            Lead.next_follow_up >= start_dt,
            Lead.next_follow_up <= end_dt
        ).all()

        action_lead_ids = {a.lead_id for a in actions if a.lead_id}

        for l in leads:
            if l.id not in action_lead_ids:
                c_name = l.customer.name if l.customer else l.name
                formatted_time = l.next_follow_up.strftime("%I:%M %p") if l.next_follow_up else "Today"
                schedule_items.append({
                    "id": f"lead_sch_{l.id}",
                    "item_type": "LEAD_FOLLOW_UP",
                    "action_type": "FOLLOW_UP",
                    "priority": "HIGH" if (l.sla_deadline and l.sla_deadline < datetime.utcnow()) else "MEDIUM",
                    "title": f"Follow-up with {l.name}",
                    "description": f"Scheduled follow-up for {l.stage} lead",
                    "due_at": l.next_follow_up or datetime.utcnow(),
                    "formatted_time": formatted_time,
                    "status": "PENDING",
                    "customer_id": l.customer_id,
                    "customer_name": c_name,
                    "lead_id": l.id,
                    "lead_name": l.name,
                    "rm_id": rm_id
                })

        schedule_items.sort(key=lambda x: x["due_at"])
        return schedule_items

