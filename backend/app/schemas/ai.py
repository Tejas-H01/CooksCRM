from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class AIChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class AIChatResponse(BaseModel):
    message: str
    role: str
    tool_calls_executed: List[str]
    data_context_summary: Dict[str, Any]
