from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class AdminUserBase(BaseModel):
    username: str
    email: EmailStr


class AdminUserCreate(AdminUserBase):
    password: str


class AdminUserLogin(BaseModel):
    username: str
    password: str


class AdminUserResponse(AdminUserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminUserResponse