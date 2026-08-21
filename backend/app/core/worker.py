import asyncio
import logging
from app.core.queue import event_queue_manager
from app.engine.event_processor import EventProcessor

logger = logging.getLogger(__name__)

async def start_queue_worker():
    logger.info("Starting background event queue worker loop...")
    try:
        while True:
            event_data = await event_queue_manager.dequeue()
            event_id = event_data.get('id') or event_data.get('idempotency_key')
            logger.info(f"[WORKER] action=PICKUP event={event_id} type={event_data.get('event_type')}")
            await event_queue_manager.start_processing()
            try:
                # Process event asynchronously using the existing rules evaluation pipeline
                await EventProcessor.process_event(event_data)
                await event_queue_manager.end_processing(success=True)
                logger.info(f"[WORKER] event={event_id} status=PROCESSED")
            except Exception as e:
                logger.error(f"[WORKER] event={event_id} status=FAILED error={e}")
                await event_queue_manager.end_processing(success=False)
            finally:
                event_queue_manager.task_done()
    except asyncio.CancelledError:
        logger.info("Event queue worker loop cancelled (graceful shutdown).")
