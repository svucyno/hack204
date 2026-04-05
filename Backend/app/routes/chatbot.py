"""AI mentor chatbot (MongoDB)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User
from app.db.mongo import get_db
from app.models.schemas import ChatMessageRequest, ChatMessageResponse
from app.services import chatbot_service

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    body: ChatMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> ChatMessageResponse:
    reply = await chatbot_service.mentor_reply(db, user.id, body.message, body.topic_hint)
    await chatbot_service.persist_exchange(db, user.id, body.message, reply)
    return ChatMessageResponse(reply=reply)


@router.get("/history")
async def history(
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    cursor = db[C.CHATBOT_HISTORY].find({"user_id": user.id}).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    rows.reverse()
    return {
        "items": [{"role": m["role"], "content": m["content"], "created_at": m["created_at"].isoformat()} for m in rows],
    }
