from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.models import Action
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
