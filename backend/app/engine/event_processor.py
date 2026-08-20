from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import Event, Action
from app.engine.rule_engine import rule_engine
import logging

logger = logging.getLogger(__name__)

class EventProcessor:
    @staticmethod
    async def process_event(event_dict: dict) -> None:
        """
        Process the ingested event, evaluate rules, and persist generated actions transactionally.
        """
        event_id = event_dict.get("id")
        event_type = event_dict.get("event_type")
        logger.info(f"EventProcessor: Processing event_id={event_id} type={event_type}")

        db = SessionLocal()
        try:
            event = db.query(Event).filter(Event.id == event_id).first()
            if not event:
                logger.error(f"EventProcessor: Event {event_id} not found in database.")
                return

            # Update event status to PROCESSING
            event.status = "PROCESSING"
            db.commit()

            # Evaluate rules
            proposed_actions = await rule_engine.evaluate_rules(db, event)
            logger.info(f"EventProcessor: Generated {len(proposed_actions)} proposed actions.")

            # Persist actions transactionally
            actions_created = 0
            for action in proposed_actions:
                # Check for existing PENDING actions of same type/RM/entities
                duplicate = db.query(Action).filter(
                    Action.action_type == action.action_type,
                    Action.rm_id == action.rm_id,
                    Action.customer_id == action.customer_id,
                    Action.lead_id == action.lead_id,
                    Action.status == "PENDING"
                ).first()

                if not duplicate:
                    db.add(action)
                    actions_created += 1
                    logger.info(f"EventProcessor: Staged Action {action.action_type} for RM {action.rm_id}")
                else:
                    logger.info(f"EventProcessor: Duplicate PENDING action for {action.action_type} skipped.")

            # Success updates
            from datetime import datetime
            event.status = "PROCESSED"
            event.processed_at = datetime.utcnow()
            event.error_message = None
            db.commit()
            if actions_created > 0:
                logger.info(f"EventProcessor: Committed {actions_created} new actions to DB.")
            else:
                logger.info("EventProcessor: No new actions to commit.")

        except Exception as e:
            db.rollback()
            logger.error(f"EventProcessor: Transaction rollback due to error: {e}", exc_info=True)
            try:
                # Re-fetch event inside a clean session block to record failure
                db_fail = SessionLocal()
                ev = db_fail.query(Event).filter(Event.id == event_id).first()
                if ev:
                    ev.status = "FAILED"
                    ev.error_message = str(e)[:500]
                    db_fail.commit()
                db_fail.close()
            except Exception as fe:
                logger.error(f"EventProcessor: Failed to save event failure details: {fe}")
            raise e
        finally:
            db.close()
