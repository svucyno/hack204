"""FastAPI dependencies: MongoDB, current user, admin guard."""

from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.documents import User, UserRole
from app.db.mongo import get_db
from app.models.schemas import APIError, ErrorDetail
from app.utils.helper import decode_token


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=APIError(error=ErrorDetail(code="unauthorized", message="Missing bearer token")).model_dump(),
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
        if payload.get("type") == "refresh":
            raise ValueError("use access token")
        sub = payload.get("sub")
        if not sub:
            raise ValueError("missing sub")
        user_id = str(uuid.UUID(str(sub)))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=APIError(error=ErrorDetail(code="invalid_token", message="Invalid or expired token")).model_dump(),
        ) from None

    from app.services import auth_service

    user = await auth_service.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=APIError(error=ErrorDetail(code="user_not_found", message="User not found or inactive")).model_dump(),
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=APIError(error=ErrorDetail(code="forbidden", message="Admin role required")).model_dump(),
        )
    return user
