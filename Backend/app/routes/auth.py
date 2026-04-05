"""Authentication: register, login, refresh, password reset, Google OAuth."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config.settings import settings
from app.core.deps import get_current_user
from app.db.documents import User
from app.db.mongo import get_db
from app.models.schemas import (
    APIError,
    AccessTokenResponse,
    ErrorDetail,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UserPublic,
)
from app.services import auth_service
from app.services.email_service import send_email
from app.utils.helper import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _public(u: User) -> UserPublic:
    return UserPublic(
        id=str(u.id),
        email=u.email,
        full_name=u.full_name,
        role=u.role.value,
        oauth_provider=u.oauth_provider.value,
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> TokenPair:
    try:
        user = await auth_service.register_user(db, body.email, body.password, body.full_name)
        access, refresh = await auth_service.issue_tokens(db, user)
        return TokenPair(access_token=access, refresh_token=refresh)
    except ValueError as e:
        if str(e) == "email_taken":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=APIError(error=ErrorDetail(code="email_taken", message="Email already registered")).model_dump(),
            ) from e
        raise


@router.post("/login", response_model=TokenPair)
async def login(body: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> TokenPair:
    user = await auth_service.authenticate_local(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=APIError(error=ErrorDetail(code="invalid_credentials", message="Invalid email or password")).model_dump(),
        )
    access, refresh = await auth_service.issue_tokens(db, user)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> TokenPair:
    try:
        access, refresh_tok = await auth_service.refresh_session(db, body.refresh_token)
        return TokenPair(access_token=access, refresh_token=refresh_tok)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=APIError(error=ErrorDetail(code="invalid_refresh", message="Invalid refresh token")).model_dump(),
        ) from None


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> dict:
    token = await auth_service.forgot_password_start(db, body.email)
    if token:
        link = f"{settings.frontend_url}/reset-password?token={token}"
        await send_email(
            body.email,
            "Password reset",
            f"Use this link to reset your password (expires in 1 hour):\n{link}\n\nIf you did not request this, ignore this email.",
        )
    return {"detail": "If the email exists, reset instructions were sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(body: ResetPasswordRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> dict:
    try:
        await auth_service.reset_password_finish(db, body.token, body.new_password)
        return {"detail": "Password updated"}
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=APIError(error=ErrorDetail(code="invalid_token", message="Invalid or expired reset token")).model_dump(),
        ) from None


@router.post("/oauth/google", response_model=TokenPair)
async def oauth_google(body: GoogleAuthRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> TokenPair:
    try:
        info = await auth_service.verify_google_id_token(body.id_token, settings.google_client_id)
        email = info.get("email")
        sub = info.get("sub")
        name = info.get("name") or ""
        if not email or not sub:
            raise ValueError("invalid_google_token")
        user = await auth_service.upsert_google_user(db, email, name, sub)
        access, refresh = await auth_service.issue_tokens(db, user)
        return TokenPair(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=APIError(error=ErrorDetail(code="oauth_failed", message=str(e))).model_dump(),
        ) from e


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)) -> UserPublic:
    return _public(user)
