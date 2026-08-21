from pydantic import BaseModel
from typing import Optional

class CustomerCreateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    segment: Optional[str] = "Retail"

class CustomerResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    segment: Optional[str] = None
    assigned_rm_id: Optional[int] = None

    class Config:
        from_attributes = True
