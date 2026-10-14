from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User
from app.api.auth import get_current_user
from app.schemas.ai import AIChatRequest, AIChatResponse
from app.services.ai_service import SalesOrbitAIEngine

router = APIRouter()

@router.post("/ai/chat", response_model=AIChatResponse)
def ai_chat_endpoint(
    body: AIChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not body.message or not body.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message prompt cannot be empty."
        )

    res = SalesOrbitAIEngine.process_chat(current_user, body.message.strip(), db)
    return AIChatResponse(
        message=res["message"],
        role=res["role"],
        tool_calls_executed=res["tool_calls_executed"],
        data_context_summary=res["data_context_summary"]
    )
