"""
Analytics and adaptive feedback (MongoDB).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User
from app.db.mongo import get_db
from app.models.schemas import APIError, DashboardAnalytics, ErrorDetail
from app.routes.learning import _doc_to_read
from app.services.analysis_service import AnalysisService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])

_analysis_service: AnalysisService | None = None


def set_analysis_dependencies(svc: AnalysisService) -> None:
    global _analysis_service
    _analysis_service = svc


def get_analysis() -> AnalysisService:
    if _analysis_service is None:
        raise RuntimeError("AnalysisService not initialized")
    return _analysis_service


@router.get("/dashboard", response_model=DashboardAnalytics)
async def dashboard(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
    svc: AnalysisService = Depends(get_analysis),
) -> DashboardAnalytics:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    cursor = db[C.PROGRESS_LOGS].find({"user_id": user.id, "created_at": {"$gte": since}})
    logs = await cursor.to_list(length=5000)
    minutes_by_topic: dict[str, float] = {}
    for e in logs:
        tid = e.get("topic_id") or "general"
        minutes_by_topic[tid] = minutes_by_topic.get(tid, 0.0) + float(e.get("minutes_spent", 0))
    total_minutes = sum(minutes_by_topic.values()) or float(days * 15)
    log_dates = {e["created_at"].date() for e in logs if e.get("created_at")}
    streak_days = min(days, max(1, len(log_dates) or 1))
    topic_scores = {k: min(1.0, 0.3 + (v / max(total_minutes, 1)) * 2) for k, v in minutes_by_topic.items()}
    if not topic_scores:
        topic_scores = {"general": 0.45}
    path_count = await db[C.LEARNING_PATHS].count_documents({"user_id": user.id})
    completion = min(99.0, 15.0 + path_count * 10.0)
    return svc.build_dashboard(
        user_id=str(user.id),
        topic_scores=topic_scores,
        minutes_by_topic=minutes_by_topic,
        streak_days=streak_days,
        completion_percent=completion,
        days=days,
    )


@router.get("/adaptive-summary")
async def adaptive_summary(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    last_quiz_percent: float = Query(72.0, ge=0, le=100),
    path_id: str | None = None,
    svc: AnalysisService = Depends(get_analysis),
) -> dict:
    path_read = None
    if path_id:
        doc = await db[C.LEARNING_PATHS].find_one({"_id": path_id, "user_id": user.id})
        if doc:
            path_read = _doc_to_read(doc)
    return svc.adaptive_feedback_summary(str(user.id), last_quiz_percent, path_read)


@router.get("/forecast")
async def forecast_weeks(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    path_id: str = Query(..., min_length=1),
    hours_per_week: float = Query(10.0, gt=0),
    svc: AnalysisService = Depends(get_analysis),
) -> dict:
    doc = await db[C.LEARNING_PATHS].find_one({"_id": path_id, "user_id": user.id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Learning path not found")).model_dump(),
        )
    weeks = svc.forecast_completion_weeks(_doc_to_read(doc), hours_per_week)
    return {"user_id": str(user.id), "path_id": path_id, "estimated_weeks": weeks, "hours_per_week": hours_per_week}


@router.post("/progress-log")
async def log_progress(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    from app.db.documents import utc_now

    await db[C.PROGRESS_LOGS].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user.id,
            "topic_id": body.get("topic_id"),
            "event_type": str(body.get("event_type", "study")),
            "minutes_spent": float(body.get("minutes_spent", 0)),
            "meta": body.get("meta") or {},
            "created_at": utc_now(),
        }
    )
    return {"detail": "logged"}
