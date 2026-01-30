"""
Admin authentication endpoints
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin_user import AdminUser
from app.schemas.admin_user import AdminUserLogin, TokenResponse, AdminUserResponse
from app.core.security import (
    authenticate_admin,
    create_access_token,
    get_current_admin
)

router = APIRouter(prefix="/api/admin/auth", tags=["Admin Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: AdminUserLogin,
    db: Session = Depends(get_db)
):
    """
    Admin login endpoint
    Returns JWT token on successful authentication
    """
    admin = authenticate_admin(db, credentials.username, credentials.password)
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password non corretti",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": admin.username})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "admin": admin
    }


@router.post("/logout")
async def logout(
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Admin logout endpoint
    (Token invalidation happens client-side by removing the token)
    """
    return {
        "message": "Logout effettuato con successo",
        "username": admin.username
    }


@router.get("/me", response_model=AdminUserResponse)
async def get_current_admin_info(
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Get current authenticated admin information
    """
    return admin


@router.get("/verify")
async def verify_token(
    admin: AdminUser = Depends(get_current_admin)
):
    """
    Verify if the provided token is valid
    """
    return {
        "valid": True,
        "username": admin.username,
        "email": admin.email
    }