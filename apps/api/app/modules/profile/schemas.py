from pydantic import BaseModel, EmailStr
from typing import Optional


class ProfileResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
