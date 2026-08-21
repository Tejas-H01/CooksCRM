from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class OpportunityCreateRequest(BaseModel):
    customer_id: int = Field(..., description="Target Customer ID")
    name: str = Field(..., min_length=2, max_length=100, description="Opportunity/Product Name")
    potential_value: float = Field(..., ge=0.0, description="Expected value in INR (>= 0)")
    probability: int = Field(50, ge=0, le=100, description="Win probability percentage (0-100)")
    stage: str = Field("QUALIFIED", description="Sales stage")
    expected_close_date: Optional[datetime] = Field(None, description="Expected close date")
    notes: Optional[str] = Field(None, max_length=500, description="Optional RM notes")

    @field_validator("stage")
    def validate_stage(cls, v):
        valid_stages = {"NEW", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "CONVERTED", "COMPLETED", "WON", "CLOSED"}
        if v.upper() not in valid_stages:
            raise ValueError(f"Invalid stage '{v}'. Must be one of {valid_stages}")
        return v.upper()

class OpportunityResponse(BaseModel):
    id: int
    customer_id: Optional[int]
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    source: Optional[str]
    stage: Optional[str]
    potential_value: float
    actual_value: float
    probability: int
    expected_close_date: Optional[datetime]
    assigned_rm_id: Optional[int]
    status: str
    reason: Optional[str]
    notes: Optional[str]
    trigger_event_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OpportunitySuggestionResponse(OpportunityResponse):
    customer_name: Optional[str] = None

class ManagerLeadResponse(BaseModel):
    id: int
    name: str
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    assigned_rm_id: int
    rm_name: Optional[str] = None
    source: Optional[str] = None
    stage: str
    status: str
    potential_value: float
    actual_value: float
    remaining_value: float
    probability: int
    expected_close_date: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
