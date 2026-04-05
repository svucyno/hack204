"""AI mentor chatbot: OpenAI when configured, else heuristic fallback with DB memory."""

from __future__ import annotations

import logging
import uuid
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config.settings import settings
from app.db import collections as C

logger = logging.getLogger(__name__)


async def load_recent_context(db: AsyncIOMotorDatabase, user_id: str, limit: int = 12) -> str:
    cursor = (
        db[C.CHATBOT_HISTORY].find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    )
    rows = await cursor.to_list(length=limit)
    rows.reverse()
    lines = [f"{m['role']}: {m['content'][:500]}" for m in rows]
    return "\n".join(lines) if lines else "(no prior chat)"


async def load_progress_hint(db: AsyncIOMotorDatabase, user_id: str) -> str:
    cursor = db[C.PROGRESS_LOGS].find({"user_id": user_id}).sort("created_at", -1).limit(5)
    ev = await cursor.to_list(length=5)
    if not ev:
        return "No recent progress logged."
    return "; ".join(f"{e.get('event_type', '')} on {e.get('topic_id') or 'general'}" for e in ev)


async def mentor_reply(
    db: AsyncIOMotorDatabase,
    user_id: str,
    user_message: str,
    topic_hint: Optional[str] = None,
) -> str:
    prof = await db[C.PROFILES].find_one({"user_id": user_id})
    goals = (prof.get("goals") if prof else None) or []
    ctx = await load_recent_context(db, user_id)
    progress = await load_progress_hint(db, user_id)

    api_key = settings.gemini_api_key or settings.openai_api_key

    if api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            sys_prompt = (
                "You are an expert, highly intelligent AI tutor and software engineer similar to ChatGPT. "
                "Provide accurate, comprehensive, and very concise answers to any technical or educational queries. "
                "If asked for links or videos, respond with the most accurate exact links (e.g. W3Schools, MDN, YouTube). "
                f"Learner goals: {goals}. Recent progress: {progress}. Topic focus: {topic_hint or 'general'}."
            )
            prompt = f"{sys_prompt}\n\nPrior conversation summary:\n{ctx}\n\nLearner: {user_message}"
            
            response = model.generate_content(prompt)
            return response.text or "I'm here to help—try rephrasing your question."
        except Exception as e:
            logger.warning("AI model error, using fallback: %s", e)

    g = ", ".join(goals[:3]) if goals else "your learning goals"
    return (
        f"I’m tracking your progress ({progress}). "
        f"For “{user_message[:120]}…”, try breaking it into a 10-minute step, then check your roadmap for the next module. "
        f"Your stated goals include: {g}. Want a quick check: name one concept from your last lesson?"
    )


async def persist_exchange(db: AsyncIOMotorDatabase, user_id: str, user_text: str, assistant_text: str) -> None:
    from app.db.documents import utc_now

    now = utc_now()
    await db[C.CHATBOT_HISTORY].insert_many(
        [
            {"_id": uuid.uuid4().hex, "user_id": user_id, "role": "user", "content": user_text, "created_at": now},
            {"_id": uuid.uuid4().hex, "user_id": user_id, "role": "assistant", "content": assistant_text, "created_at": now},
        ]
    )
