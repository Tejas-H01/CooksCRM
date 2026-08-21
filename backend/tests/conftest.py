import pytest
from app.core.queue import event_queue_manager

@pytest.fixture(autouse=True)
def configure_queue_mode_for_test(request):
    # Disable the background queue (routing events directly to event_bus synchronously)
    # for all tests except the queue-specific unit tests.
    if "test_queue_first_mile" in request.node.fspath.strpath:
        event_queue_manager.disabled = False
    else:
        event_queue_manager.disabled = True
    yield
