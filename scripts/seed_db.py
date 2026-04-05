#!/usr/bin/env python3
"""
Seed MongoDB with demo users (admin + learner) and a sample notification.
Run from repo root:  python scripts/seed_db.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND = os.path.join(ROOT, "Backend")
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

os.chdir(BACKEND)

from app.config.settings import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db import collections as C  # noqa: E402
from app.db.documents import OAuthProvider, UserRole, utc_now  # noqa: E402
from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402


async def run() -> None:
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]
    now = utc_now()

    async def ensure_user(email: str, password: str | None, name: str, role: UserRole) -> str:
        existing = await db[C.USERS].find_one({"email": email})
        if existing:
            return str(existing["_id"])
        uid = str(uuid.uuid4())
        await db[C.USERS].insert_one(
            {
                "_id": uid,
                "email": email,
                "hashed_password": hash_password(password) if password else None,
                "full_name": name,
                "role": role.value,
                "is_active": True,
                "oauth_provider": OAuthProvider.local.value if password else OAuthProvider.google.value,
                "oauth_sub": None,
                "refresh_token_hash": None,
                "created_at": now,
                "updated_at": now,
            }
        )
        return uid

    await ensure_user("admin@example.com", "Admin123!", "Admin User", UserRole.admin)
    learner_id = await ensure_user("learner@example.com", "Learner123!", "Demo Learner", UserRole.learner)

    n = await db[C.NOTIFICATIONS].count_documents({"user_id": learner_id})
    if n == 0:
        await db[C.NOTIFICATIONS].insert_one(
            {
                "_id": str(uuid.uuid4()),
                "user_id": learner_id,
                "title": "Welcome",
                "body": "Complete your profile and run a diagnostic quiz.",
                "kind": "onboarding",
                "read": False,
                "created_at": now,
            }
        )

    client.close()
    print("Seeded admin@example.com / Admin123!  and  learner@example.com / Learner123!")


if __name__ == "__main__":
    asyncio.run(run())
