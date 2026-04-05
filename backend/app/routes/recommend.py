"""
Recommendation REST endpoints (MongoDB + YouTube).
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User, utc_now
from app.db.mongo import get_db
from app.models.schemas import RecommendationItem, RecommendRequest, RecommendResponse, ResourceType
from app.services.ai_service import AIService
from app.services.youtube_service import search_videos

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommend", tags=["recommend"])

_ai_service: AIService | None = None


def set_recommend_dependencies(ai: AIService) -> None:
    global _ai_service
    _ai_service = ai


def get_ai() -> AIService:
    if _ai_service is None:
        raise RuntimeError("AIService not initialized")
    return _ai_service


def _rtype_str(rt: ResourceType) -> str:
    return rt.value


@router.post("/items", response_model=RecommendResponse)
async def recommend_items(
    body: RecommendRequest,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    ai: AIService = Depends(get_ai),
) -> RecommendResponse:
    prof = await db[C.PROFILES].find_one({"user_id": user.id})
    interests = list(prof.get("interests") or []) if prof else ["python", "ml"]
    weak = ai.weak_topic_prediction({t: 0.5 for t in interests[:5]} if interests else {"py-basics": 0.4})
    resp = ai.recommend(str(user.id), interests, weak, limit=body.limit, topic_focus=body.topic_focus)
    yt_query = body.topic_focus or (interests[0] if interests else "machine learning")
    yt = await search_videos(f"tutorial {yt_query}", max_results=3)
    merged = list(resp.items)
    for y in yt:
        merged.insert(
            0,
            RecommendationItem(
                resource_id=uuid.uuid4().hex,
                title=y["title"],
                type=ResourceType.video,
                topic_id=body.topic_focus or "general",
                url=y["url"],
                score=0.9,
                rationale="YouTube search result",
            ),
        )
    merged = merged[: body.limit]
    now = utc_now()
    for it in merged:
        await db[C.RECOMMENDATIONS].insert_one(
            {
                "_id": str(uuid.uuid4()),
                "user_id": user.id,
                "resource_type": _rtype_str(it.type),
                "title": it.title,
                "url": it.url,
                "topic_id": it.topic_id,
                "score": it.score,
                "rationale": it.rationale,
                "created_at": now,
            }
        )
    return RecommendResponse(user_id=str(user.id), items=merged, next_best_topic=resp.next_best_topic)


@router.get("/next-topic")
async def next_topic(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    ai: AIService = Depends(get_ai),
    topic_focus: str | None = None,
) -> dict:
    prof = await db[C.PROFILES].find_one({"user_id": user.id})
    interests = list(prof.get("interests") or []) if prof else ["python", "dsa", "ml"]
    resp = ai.recommend(str(user.id), interests, ["py-basics"], limit=5, topic_focus=topic_focus)
    return {
        "user_id": str(user.id),
        "next_best_topic": resp.next_best_topic,
        "top_pick": resp.items[0].model_dump() if resp.items else None,
    }
