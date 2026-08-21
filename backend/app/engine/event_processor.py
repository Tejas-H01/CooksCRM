from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import Event, Action, Customer, Lead, Target
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
        logger.info(f"[PROCESSOR] event={event_id} type={event_type}")

        db = SessionLocal()
        try:
            event = db.query(Event).filter(Event.id == event_id).first()
            if not event:
                logger.error(f"EventProcessor: Event {event_id} not found in database.")
                return

            if event.status not in ["PENDING", "QUEUED"]:
                logger.warning(f"EventProcessor: Event {event_id} is already in status {event.status}. Aborting to prevent double processing.")
                return

            # Update event status to PROCESSING
            event.status = "PROCESSING"
            
            # --- Target & Pipeline Intelligence Hook ---
            if event.event_type in ["PAYIN_RECEIVED", "PRODUCT_PURCHASED"]:
                amount = event.payload.get("amount", 0) or event.payload.get("value", 0)
                if amount:
                    amount = float(amount)
                    rm_id = None
                    lead_id = None
                    
                    if event.entity_type == "CUSTOMER":
                        cust = db.query(Customer).filter(Customer.id == int(event.entity_id)).first()
                        if cust:
                            rm_id = cust.assigned_rm_id
                            lead = db.query(Lead).filter(Lead.customer_id == cust.id, Lead.status == "OPEN").first()
                            if lead:
                                lead_id = lead.id
                    elif event.entity_type == "LEAD":
                        lead = db.query(Lead).filter(Lead.id == int(event.entity_id)).first()
                        if lead:
                            rm_id = lead.assigned_rm_id
                            lead_id = lead.id
                            
                    if rm_id:
                        target = db.query(Target).filter(Target.rm_id == rm_id).first()
                        if target:
                            target.achieved_value = float(target.achieved_value) + amount
                            logger.info(f"EventProcessor: Incremented RM {rm_id} target achieved by {amount}.")
                            
                    if lead_id:
                        lead_obj = db.query(Lead).filter(Lead.id == lead_id).first()
                        lead_obj.actual_value = float(lead_obj.actual_value) + amount
                        if lead_obj.actual_value >= lead_obj.potential_value:
                            lead_obj.status = "CLOSED"
                            lead_obj.stage = "CONVERTED"
                        logger.info(f"EventProcessor: Updated Lead {lead_id} actual value by {amount}.")
            # ----------------------------------------
            
            db.commit()

            # Evaluate rules
            proposed_actions = await rule_engine.evaluate_rules(db, event)
            logger.info(f"EventProcessor: Generated {len(proposed_actions)} proposed actions.")

            # Persist actions & suggestions transactionally
            actions_created = 0
            for item in proposed_actions:
                if isinstance(item, Action):
                    duplicate = db.query(Action).filter(
                        Action.action_type == item.action_type,
                        Action.rm_id == item.rm_id,
                        Action.customer_id == item.customer_id,
                        Action.lead_id == item.lead_id,
                        Action.status == "PENDING"
                    ).first()

                    if not duplicate:
                        db.add(item)
                        actions_created += 1
                        logger.info(f"[ACTION] event={event_id} action={item.action_type} id={item.id} rm={item.rm_id} priority={item.priority} score={item.score}")
                    else:
                        logger.info(f"EventProcessor: Duplicate PENDING action for {item.action_type} skipped.")
                elif isinstance(item, Lead):
                    duplicate_lead = db.query(Lead).filter(
                        Lead.customer_id == item.customer_id,
                        Lead.status.in_(["OPEN", "SUGGESTED"])
                    ).first()

                    if not duplicate_lead:
                        db.add(item)
                        actions_created += 1
                        logger.info(f"[SUGGESTION] event={event_id} suggestion created for customer={item.customer_id}")
                    else:
                        logger.info(f"EventProcessor: Duplicate Lead/Suggestion for Customer {item.customer_id} skipped.")

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
