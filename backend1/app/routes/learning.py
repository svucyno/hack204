"""Learning path REST endpoints persisted in MongoDB."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User, utc_now
from app.db.mongo import get_db
from app.models.schemas import (
    APIError,
    ErrorDetail,
    LearningPathCreate,
    LearningPathRead,
    ModuleNode,
    PathRegenerateRequest,
)
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learning", tags=["learning"])

_ai_service: AIService | None = None


def set_learning_dependencies(ai: AIService) -> None:
    global _ai_service
    _ai_service = ai


def get_ai() -> AIService:
    if _ai_service is None:
        raise RuntimeError("AIService not initialized")
    return _ai_service


def _doc_to_read(doc: dict) -> LearningPathRead:
    mods = sorted(doc.get("modules") or [], key=lambda m: m.get("order_index", 0))
    return LearningPathRead(
        path_id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        goal_summary=doc["goal_summary"],
        modules=[
            ModuleNode(
                topic_id=m["topic_id"],
                title=m["title"],
                estimated_hours=float(m.get("estimated_hours", 0)),
                prerequisites=list(m.get("prerequisites") or []),
                order_index=int(m.get("order_index", 0)),
            )
            for m in mods
        ],
        total_estimated_hours=float(doc.get("total_estimated_hours", 0)),
        daily_roadmap=list(doc.get("daily_roadmap") or []),
        milestones=list(doc.get("milestones") or []),
        generated_at=doc["created_at"],
        version=int(doc.get("version", 1)),
    )


@router.post("/path", response_model=LearningPathRead, status_code=status.HTTP_201_CREATED)
async def create_path(
    body: LearningPathCreate,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    ai: AIService = Depends(get_ai),
) -> LearningPathRead:
    path = ai.generate_learning_path(str(user.id), body.goal_summary, body.topics_available, body.topics_available or None)
    pid = str(uuid.uuid4())
    now = utc_now()
    modules = [
        {
            "topic_id": m.topic_id,
            "title": m.title,
            "order_index": m.order_index,
            "estimated_hours": m.estimated_hours,
            "prerequisites": m.prerequisites,
        }
        for m in path.modules
    ]
    doc = {
        "_id": pid,
        "user_id": user.id,
        "goal_summary": path.goal_summary,
        "version": path.version,
        "total_estimated_hours": path.total_estimated_hours,
        "daily_roadmap": path.daily_roadmap,
        "milestones": path.milestones,
        "modules": modules,
        "confidence_score": None,
        "created_at": now,
        "updated_at": now,
    }
    await db[C.LEARNING_PATHS].insert_one(doc)
    logger.info("Persisted learning path", extra={"path_id": pid, "user_id": user.id})
    return _doc_to_read(doc)


@router.get("/path/{path_id}", response_model=LearningPathRead)
async def get_path(
    path_id: str,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> LearningPathRead:
    doc = await db[C.LEARNING_PATHS].find_one({"_id": path_id, "user_id": user.id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Learning path not found")).model_dump(),
        )
    return _doc_to_read(doc)


@router.post("/path/regenerate", response_model=LearningPathRead)
async def regenerate_path(
    body: PathRegenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    ai: AIService = Depends(get_ai),
) -> LearningPathRead:
    base_doc = await db[C.LEARNING_PATHS].find_one({"_id": body.path_id, "user_id": user.id})
    if not base_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Learning path not found")).model_dump(),
        )
    base_read = _doc_to_read(base_doc)
    new_path = ai.regenerate_path(base_read, body.recent_quiz_scores)
    pid = str(uuid.uuid4())
    now = utc_now()
    modules = [
        {
            "topic_id": m.topic_id,
            "title": m.title,
            "order_index": m.order_index,
            "estimated_hours": m.estimated_hours,
            "prerequisites": m.prerequisites,
        }
        for m in new_path.modules
    ]
    doc = {
        "_id": pid,
        "user_id": user.id,
        "goal_summary": new_path.goal_summary,
        "version": new_path.version,
        "total_estimated_hours": new_path.total_estimated_hours,
        "daily_roadmap": new_path.daily_roadmap,
        "milestones": new_path.milestones,
        "modules": modules,
        "confidence_score": None,
        "created_at": now,
        "updated_at": now,
    }
    await db[C.LEARNING_PATHS].insert_one(doc)
    return _doc_to_read(doc)


@router.get("/paths", response_model=list[LearningPathRead])
async def list_paths(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> list[LearningPathRead]:
    cursor = (
        db[C.LEARNING_PATHS]
        .find({"user_id": user.id})
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    rows = await cursor.to_list(length=page_size)
    return [_doc_to_read(d) for d in rows]
