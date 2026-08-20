from abc import ABC, abstractmethod
from typing import Callable, Coroutine, Any, Dict, List
import logging

logger = logging.getLogger(__name__)

# Subscriber callback type
SubscriberCallback = Callable[[Any], Coroutine[Any, Any, None]]

class EventBus(ABC):
    @abstractmethod
    async def publish(self, channel: str, event_data: Any) -> None:
        """Publish an event to a channel/topic."""
        pass

    @abstractmethod
    async def subscribe(self, channel: str, callback: SubscriberCallback) -> None:
        """Subscribe to a channel/topic with a callback."""
        pass

    @abstractmethod
    async def unsubscribe(self, channel: str, callback: SubscriberCallback) -> None:
        """Unsubscribe a callback from a channel/topic."""
        pass


class InMemoryEventBus(EventBus):
    def __init__(self) -> None:
        self._subscribers: Dict[str, List[SubscriberCallback]] = {}

    async def publish(self, channel: str, event_data: Any) -> None:
        logger.info(f"InMemoryEventBus: Publishing event to channel '{channel}'")
        if channel in self._subscribers:
            for callback in self._subscribers[channel]:
                try:
                    await callback(event_data)
                except Exception as e:
                    logger.error(f"InMemoryEventBus: Error in callback on channel '{channel}': {e}", exc_info=True)

    async def subscribe(self, channel: str, callback: SubscriberCallback) -> None:
        logger.info(f"InMemoryEventBus: Subscribing to channel '{channel}'")
        if channel not in self._subscribers:
            self._subscribers[channel] = []
        if callback not in self._subscribers[channel]:
            self._subscribers[channel].append(callback)

    async def unsubscribe(self, channel: str, callback: SubscriberCallback) -> None:
        logger.info(f"InMemoryEventBus: Unsubscribing from channel '{channel}'")
        if channel in self._subscribers:
            if callback in self._subscribers[channel]:
                self._subscribers[channel].remove(callback)
            if not self._subscribers[channel]:
                del self._subscribers[channel]

# Global/shared instance of InMemoryEventBus
event_bus = InMemoryEventBus()
