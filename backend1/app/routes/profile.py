"""User profile management (MongoDB)."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User, utc_now
from app.db.mongo import get_db
from app.models.schemas import LearningStyle, MeResponse, ProfileRead, ProfileUpsert, SkillLevel
from app.routes.auth import _public

router = APIRouter(prefix="/profile", tags=["profile"])


async def _get_or_create_profile(db: AsyncIOMotorDatabase, user: User) -> dict:
    doc = await db[C.PROFILES].find_one({"user_id": user.id})
    if doc:
        return doc
    now = utc_now()
    pid = str(uuid.uuid4())
    await db[C.PROFILES].insert_one(
        {
            "_id": pid,
            "user_id": user.id,
            "educational_background": None,
            "current_skill_level": "beginner",
            "interests": [],
            "learning_speed": 1.0,
            "preferred_learning_style": "visual",
            "goals": [],
            "target_completion_date": None,
            "created_at": now,
            "updated_at": now,
        }
    )
    d = await db[C.PROFILES].find_one({"user_id": user.id})
    assert d is not None
    return d


def _to_read(p: dict) -> ProfileRead:
    try:
        lvl = SkillLevel(p.get("current_skill_level", "beginner"))
    except ValueError:
        lvl = SkillLevel.beginner
    try:
        sty = LearningStyle(p.get("preferred_learning_style", "visual"))
    except ValueError:
        sty = LearningStyle.visual
    tcd = p.get("target_completion_date")
    if isinstance(tcd, datetime):
        tcd = tcd.date()
    return ProfileRead(
        user_id=str(p["user_id"]),
        educational_background=p.get("educational_background"),
        current_skill_level=lvl,
        interests=list(p.get("interests") or []),
        learning_speed=float(p.get("learning_speed", 1.0)),
        preferred_learning_style=sty,
        goals=list(p.get("goals") or []),
        target_completion_date=tcd if isinstance(tcd, date) else None,
        updated_at=p.get("updated_at") or datetime.now(timezone.utc),
    )


@router.get("/me", response_model=MeResponse)
async def profile_me(user: User = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)) -> MeResponse:
    p = await _get_or_create_profile(db, user)
    return MeResponse(user=_public(user), profile=_to_read(p))


@router.put("", response_model=ProfileRead)
async def upsert_profile(
    body: ProfileUpsert,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> ProfileRead:
    await _get_or_create_profile(db, user)
    data = body.model_dump(exclude_unset=True)
    set_doc: dict = {"updated_at": utc_now()}
    if "educational_background" in data:
        set_doc["educational_background"] = data["educational_background"]
    if "current_skill_level" in data:
        set_doc["current_skill_level"] = data["current_skill_level"].value
    if "interests" in data:
        set_doc["interests"] = data["interests"]
    if "learning_speed" in data:
        set_doc["learning_speed"] = data["learning_speed"]
    if "preferred_learning_style" in data:
        set_doc["preferred_learning_style"] = data["preferred_learning_style"].value
    if "goals" in data:
        set_doc["goals"] = data["goals"]
    if "target_completion_date" in data:
        set_doc["target_completion_date"] = data["target_completion_date"]
    await db[C.PROFILES].update_one({"user_id": user.id}, {"$set": set_doc})
    p = await db[C.PROFILES].find_one({"user_id": user.id})
    assert p is not None
    return _to_read(p)


@router.get("", response_model=ProfileRead)
async def get_profile(user: User = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)) -> ProfileRead:
    p = await _get_or_create_profile(db, user)
    return _to_read(p)
