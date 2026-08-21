import asyncio
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class EventQueueManager:
    def __init__(self, maxsize: int = 10000):
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=maxsize)
        self._processed_count: int = 0
        self._failed_count: int = 0
        self._active_processing: int = 0
        self._total_queued: int = 0
        self._lock = asyncio.Lock()

    async def enqueue(self, event_data: dict) -> None:
        async with self._lock:
            await self.queue.put(event_data)
            self._total_queued += 1
            logger.info(f"[QUEUE] action=ENQUEUE event={event_data.get('id') or event_data.get('idempotency_key')} depth={self.queue.qsize()} total_queued={self._total_queued}")

    async def dequeue(self) -> dict:
        event_data = await self.queue.get()
        logger.info(f"[QUEUE] action=DEQUEUE event={event_data.get('id') or event_data.get('idempotency_key')} depth={self.queue.qsize()} active_processing={self._active_processing}")
        return event_data

    def task_done(self) -> None:
        self.queue.task_done()

    async def start_processing(self) -> None:
        async with self._lock:
            self._active_processing += 1

    async def end_processing(self, success: bool = True) -> None:
        async with self._lock:
            self._active_processing = max(0, self._active_processing - 1)
            if success:
                self._processed_count += 1
            else:
                self._failed_count += 1

    async def get_stats(self) -> Dict[str, Any]:
        async with self._lock:
            return {
                "queue_depth": self.queue.qsize(),
                "active_processing": self._active_processing,
                "processed_count": self._processed_count,
                "failed_count": self._failed_count,
                "total_queued": self._total_queued
            }

# Global queue manager instance
event_queue_manager = EventQueueManager()
