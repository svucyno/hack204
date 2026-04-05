"""In-app notifications (MongoDB)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User
from app.db.mongo import get_db
from app.models.schemas import APIError, ErrorDetail, NotificationRead, PaginatedMeta

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _to_read(n: dict) -> NotificationRead:
    return NotificationRead(
        id=str(n["_id"]),
        title=n["title"],
        body=n.get("body", ""),
        kind=n.get("kind", "info"),
        read=bool(n.get("read", False)),
        created_at=n["created_at"],
    )


@router.get("", response_model=dict)
async def list_notifications(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
) -> dict:
    filt: dict = {"user_id": user.id}
    if unread_only:
        filt["read"] = False
    total = await db[C.NOTIFICATIONS].count_documents(filt)
    cursor = (
        db[C.NOTIFICATIONS].find(filt).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    )
    rows = await cursor.to_list(length=page_size)
    return {
        "items": [_to_read(n) for n in rows],
        "meta": PaginatedMeta(page=page, page_size=page_size, total=total).model_dump(),
    }


@router.post("/{notification_id}/read", status_code=status.HTTP_200_OK)
async def mark_read(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    r = await db[C.NOTIFICATIONS].update_one(
        {"_id": notification_id, "user_id": user.id},
        {"$set": {"read": True}},
    )
    if r.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Notification not found")).model_dump(),
        )
    return {"detail": "ok"}


@router.post("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_read(user: User = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)) -> dict:
    await db[C.NOTIFICATIONS].update_many({"user_id": user.id}, {"$set": {"read": True}})
    return {"detail": "ok"}
