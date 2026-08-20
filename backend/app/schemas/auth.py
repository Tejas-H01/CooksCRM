from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    team_id: Optional[int] = None
    parent_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True
