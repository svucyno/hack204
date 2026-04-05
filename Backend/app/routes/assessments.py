"""Assessment listing (MongoDB)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User
from app.db.mongo import get_db
from app.models.schemas import APIError, ErrorDetail, PaginatedMeta

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("")
async def list_assessments(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    kind: str | None = None,
) -> dict:
    filt: dict = {"user_id": user.id}
    if kind:
        filt["kind"] = kind
    total = await db[C.ASSESSMENTS].count_documents(filt)
    cursor = (
        db[C.ASSESSMENTS].find(filt).sort("started_at", -1).skip((page - 1) * page_size).limit(page_size)
    )
    rows = await cursor.to_list(length=page_size)
    items = [
        {
            "id": str(a["_id"]),
            "title": a.get("title", ""),
            "kind": a.get("kind", "quiz"),
            "score_percent": a.get("score_percent"),
            "classified_level": a.get("classified_level"),
            "started_at": a["started_at"].isoformat() if a.get("started_at") else None,
            "completed_at": a["completed_at"].isoformat() if a.get("completed_at") else None,
        }
        for a in rows
    ]
    return {"items": items, "meta": PaginatedMeta(page=page, page_size=page_size, total=total).model_dump()}


@router.get("/{assessment_id}")
async def get_assessment(
    assessment_id: str,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    a = await db[C.ASSESSMENTS].find_one({"_id": assessment_id, "user_id": user.id})
    if not a:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Assessment not found")).model_dump(),
        )
    return {
        "id": str(a["_id"]),
        "title": a.get("title", ""),
        "kind": a.get("kind", "quiz"),
        "score_percent": a.get("score_percent"),
        "topic_breakdown": a.get("topic_breakdown"),
        "weak_topics": a.get("weak_topics"),
        "classified_level": a.get("classified_level"),
        "started_at": a["started_at"].isoformat() if a.get("started_at") else None,
        "completed_at": a["completed_at"].isoformat() if a.get("completed_at") else None,
    }
