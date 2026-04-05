"""Motor async MongoDB client, indexes, and FastAPI dependency."""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config.settings import settings
from app.db import collections as C

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None


def get_mongo_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("MongoDB client not initialized")
    return _client


def get_mongo_database() -> AsyncIOMotorDatabase:
    return get_mongo_client()[settings.mongodb_db_name]


async def connect_mongo() -> None:
    global _client
    if _client is not None:
        return
    _client = AsyncIOMotorClient(settings.mongodb_url)
    logger.info("MongoDB client created for database %s", settings.mongodb_db_name)


async def disconnect_mongo() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB client closed")


async def init_mongo_indexes() -> None:
    if settings.skip_db_init:
        logger.warning("SKIP_DB_INIT=true — skipping MongoDB index creation")
        return
    db = get_mongo_database()
    await db[C.USERS].create_index("email", unique=True)
    await db[C.USERS].create_index("oauth_sub")
    await db[C.PROFILES].create_index("user_id", unique=True)
    await db[C.ASSESSMENTS].create_index("user_id")
    await db[C.ANSWERS].create_index([("assessment_id", 1), ("question_id", 1), ("user_id", 1)])
    await db[C.LEARNING_PATHS].create_index("user_id")
    await db[C.RECOMMENDATIONS].create_index("user_id")
    await db[C.PROGRESS_LOGS].create_index("user_id")
    await db[C.PROGRESS_LOGS].create_index("created_at")
    await db[C.CHATBOT_HISTORY].create_index("user_id")
    await db[C.CHATBOT_HISTORY].create_index("created_at")
    await db[C.NOTIFICATIONS].create_index([("user_id", 1), ("read", 1)])
    await db[C.ADMIN_LOGS].create_index("created_at")
    await db[C.COURSES].create_index("provider")
    logger.info("MongoDB indexes ensured")


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    yield get_mongo_database()
