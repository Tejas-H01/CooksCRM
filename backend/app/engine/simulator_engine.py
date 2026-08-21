import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.core.queue import event_queue_manager

logger = logging.getLogger(__name__)

# Core customer journey blueprints
JOURNEY_BLUEPRINTS = {
    "HIGH_INTENT_CUSTOMER": [
        {"event_type": "WEBSITE_VISIT", "entity_type": "CUSTOMER", "payload": {"page": "portfolio_overview"}, "delay": 2},
        {"event_type": "PRODUCT_VIEW", "entity_type": "CUSTOMER", "payload": {"product": "Mutual Funds"}, "delay": 3},
        {"event_type": "PRODUCT_ENQUIRY", "entity_type": "CUSTOMER", "payload": {"product": "Mutual Funds", "query": "What is the return rate?"}, "delay": 4},
        {"event_type": "CAMPAIGN_RESPONSE", "entity_type": "CUSTOMER", "payload": {"campaign": "Wealth Plus"}, "delay": 0}
    ],
    "PURCHASING_CUSTOMER": [
        {"event_type": "WEBSITE_VISIT", "entity_type": "CUSTOMER", "payload": {"page": "ecom_home"}, "delay": 2},
        {"event_type": "PRODUCT_VIEW", "entity_type": "CUSTOMER", "payload": {"product": "Corporate Bonds", "price": 50000}, "delay": 3},
        {"event_type": "PRODUCT_PURCHASED", "entity_type": "CUSTOMER", "payload": {"product": "Corporate Bonds", "amount": 50000}, "delay": 0}
    ],
    "AT_RISK_CUSTOMER": [
        {"event_type": "WEBSITE_VISIT", "entity_type": "CUSTOMER", "payload": {"page": "help_desk"}, "delay": 3},
        {"event_type": "PRODUCT_ENQUIRY", "entity_type": "CUSTOMER", "payload": {"product": "Savings Account", "issue": "unauthorized fees"}, "delay": 4},
        {"event_type": "REDEMPTION", "entity_type": "CUSTOMER", "payload": {"account": "Savings", "amount": 100000}, "delay": 0}
    ],
    "REPEAT_CUSTOMER": [
        {"event_type": "WEBSITE_VISIT", "entity_type": "CUSTOMER", "payload": {"page": "dashboard"}, "delay": 2},
        {"event_type": "PRODUCT_VIEW", "entity_type": "CUSTOMER", "payload": {"product": "Insurance Plan A"}, "delay": 3},
        {"event_type": "PRODUCT_PURCHASED", "entity_type": "CUSTOMER", "payload": {"product": "Insurance Plan A"}, "delay": 5},
        {"event_type": "WEBSITE_VISIT", "entity_type": "CUSTOMER", "payload": {"page": "dashboard"}, "delay": 3},
        {"event_type": "PRODUCT_ENQUIRY", "entity_type": "CUSTOMER", "payload": {"product": "Insurance Plan B"}, "delay": 0}
    ]
}

# Source channels list
SOURCES = ["website", "mobile_app", "email_campaign", "support_desk", "payment_gateway"]

class CustomerSimulatorEngine:
    def __init__(self):
        self.is_running: bool = False
        self._active_tasks: List[asyncio.Task] = []
        self._lock = asyncio.Lock()

    def _get_db_customer_pool(self) -> List[Dict[str, str]]:
        from app.db.database import SessionLocal
        from app.models.models import Customer
        db = SessionLocal()
        try:
            customers = db.query(Customer).filter(Customer.assigned_rm_id != None).all()
            if customers:
                return [{"id": str(c.id), "name": c.name} for c in customers]
        except Exception as e:
            logger.warning(f"Failed to fetch DB customers for simulator pool: {e}")
        finally:
            db.close()
        return [{"id": "7", "name": "John Smith"}, {"id": "8", "name": "Jane Doe"}]

    async def start(self) -> None:
        async with self._lock:
            if self.is_running:
                return
            self.is_running = True
            loop_task = asyncio.create_task(self._simulation_loop())
            self._active_tasks.append(loop_task)
            logger.info("Customer Simulator Engine started.")

    async def stop(self) -> None:
        async with self._lock:
            if not self.is_running:
                return
            self.is_running = False
            for t in self._active_tasks:
                t.cancel()
            self._active_tasks.clear()
            logger.info("Customer Simulator Engine stopped.")

    async def trigger_journey(self, blueprint_name: str, customer_id: Optional[str] = None) -> None:
        if blueprint_name not in JOURNEY_BLUEPRINTS:
            raise ValueError(f"Unknown blueprint: {blueprint_name}")
        
        if not customer_id or customer_id in ["1", "2"]:
            pool = self._get_db_customer_pool()
            customer_id = pool[0]["id"] if pool else "7"
        
        journey_task = asyncio.create_task(self._run_journey(blueprint_name, customer_id))
        self._active_tasks.append(journey_task)

    async def _run_journey(self, blueprint_name: str, customer_id: str) -> None:
        steps = JOURNEY_BLUEPRINTS[blueprint_name]
        logger.info(f"Starting journey '{blueprint_name}' for Customer ID {customer_id}")
        
        base_id = str(uuid.uuid4())[:8]
        import random
        source = random.choice(SOURCES)
        
        from app.db.database import SessionLocal
        from app.schemas.event import EventCreate
        from app.services.event_service import ingest_event
        
        for idx, step in enumerate(steps):
            db = SessionLocal()
            try:
                event_create = EventCreate(
                    event_type=step["event_type"],
                    entity_type=step["entity_type"],
                    entity_id=customer_id,
                    actor_id="SIMULATOR",
                    payload=step["payload"],
                    occurred_at=datetime.utcnow(),
                    idempotency_key=f"sim_{blueprint_name}_{customer_id}_{base_id}_{idx}"
                )
                db_event = await ingest_event(db, event_create)
                logger.info(f"[SIMULATOR] customer={customer_id} event={step['event_type']} id={db_event.id} key={db_event.idempotency_key}")
            except Exception as e:
                logger.error(f"Simulator failed to ingest step {idx+1}: {e}")
            finally:
                db.close()
            
            logger.info(f"Simulator enqueued step {idx+1}/{len(steps)} ({step['event_type']}) for Customer {customer_id}")
            
            if idx < len(steps) - 1 and step["delay"] > 0 and self.is_running:
                await asyncio.sleep(step["delay"])

    async def _simulation_loop(self) -> None:
        import random
        logger.info("Simulator continuous background loop started.")
        try:
            while self.is_running:
                # Select a random blueprint and a random customer from the real DB pool
                pool = self._get_db_customer_pool()
                blueprint_name = random.choice(list(JOURNEY_BLUEPRINTS.keys()))
                customer = random.choice(pool)
                await self.trigger_journey(blueprint_name, customer["id"])
                
                # Wait 10-15 seconds before starting another random journey
                await asyncio.sleep(random.randint(10, 15))
        except asyncio.CancelledError:
            logger.info("Simulator background loop cancelled.")

# Global simulator engine instance
simulator_engine = simulator_engine_instance = CustomerSimulatorEngine()
