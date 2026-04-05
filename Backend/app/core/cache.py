"""Redis cache helper (optional — no-op if Redis unavailable)."""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

from app.config.settings import settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is False:
        return None
    if _client is not None:
        return _client
    try:
        import redis.asyncio as redis

        _client = redis.from_url(settings.redis_url, decode_responses=True)
        return _client
    except Exception as e:
        logger.warning("Redis unavailable, caching disabled: %s", e)
        _client = False
        return None


async def cache_get(key: str) -> Optional[str]:
    r = _get_client()
    if not r:
        return None
    try:
        return await r.get(key)
    except Exception as e:
        logger.debug("cache get error: %s", e)
        return None


async def cache_set(key: str, value: str, ttl: int = 300) -> None:
    r = _get_client()
    if not r:
        return
    try:
        await r.setex(key, ttl, value)
    except Exception as e:
        logger.debug("cache set error: %s", e)


async def cache_delete(key: str) -> None:
    r = _get_client()
    if not r:
        return
    try:
        await r.delete(key)
    except Exception as e:
        logger.debug("cache delete error: %s", e)


def cache_key(prefix: str, *parts: str) -> str:
    return f"{prefix}:" + ":".join(parts)


async def cache_get_json(key: str) -> Any:
    raw = await cache_get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


async def cache_set_json(key: str, obj: Any, ttl: int = 300) -> None:
    await cache_set(key, json.dumps(obj), ttl=ttl)
