"""Create in-app notifications."""

from __future__ import annotations

import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db import collections as C
from app.db.documents import utc_now


async def notify_user(
    db: AsyncIOMotorDatabase,
    user_id: str,
    title: str,
    body: str,
    kind: str = "info",
) -> None:
    await db[C.NOTIFICATIONS].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "body": body,
            "kind": kind,
            "read": False,
            "created_at": utc_now(),
        }
    )
