import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.health import router as health_router
from app.api.events import router as events_router
from app.api.actions import router as actions_router
from app.api.simulator import router as simulator_router
from app.api.performance import router as performance_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.api.rm import router as rm_router
from app.api.manager import router as manager_router
from app.api.regional import router as regional_router

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("app.main")

app = FastAPI(
    title="Event-Driven Sales CRM Backend",
    description="Foundational Event-Driven Operational Intelligence CRM Backend",
    version="0.1.0",
    debug=settings.DEBUG,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router, prefix="/api/v1", tags=["Health"])
app.include_router(events_router, prefix="/api/v1", tags=["Events"])
app.include_router(actions_router, prefix="/api/v1", tags=["Actions"])
app.include_router(simulator_router, prefix="/api/v1", tags=["Simulator"])
app.include_router(performance_router, prefix="/api/v1", tags=["Performance"])
app.include_router(auth_router, prefix="/api/v1", tags=["Auth"])
app.include_router(admin_router, prefix="/api/v1", tags=["Admin"])
app.include_router(rm_router, prefix="/api/v1", tags=["RM"])
app.include_router(manager_router, prefix="/api/v1", tags=["Manager"])
app.include_router(regional_router, prefix="/api/v1", tags=["Regional"])

# Root and legacy health endpoint (GET /health)
@app.get("/health", tags=["Health"])
def health_redirect():
    return {"status": "healthy", "service": "crm-backend"}

bg_tasks = []

@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI CRM Backend starting up...")
    
    # Register EventProcessor to all EventTypes in the EventBus
    from app.events.event_bus import event_bus
    from app.schemas.event import EventType
    from app.engine.event_processor import EventProcessor
    import app.engine.rules  # Ensures rules are registered

    for event_type in EventType:
        await event_bus.subscribe(event_type.value, EventProcessor.process_event)
    logger.info("EventProcessor subscribed to all EventBus channels.")

    # Start the queue worker in the background
    from app.core.worker import start_queue_worker
    import asyncio
    worker_task = asyncio.create_task(start_queue_worker())
    bg_tasks.append(worker_task)
    logger.info("Background queue worker task started.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI CRM Backend shutting down...")
    import asyncio
    for task in bg_tasks:
        task.cancel()
    if bg_tasks:
        await asyncio.gather(*bg_tasks, return_exceptions=True)
        bg_tasks.clear()
        
    from app.engine.simulator_engine import simulator_engine
    await simulator_engine.stop()
    logger.info("Graceful shutdown complete.")
