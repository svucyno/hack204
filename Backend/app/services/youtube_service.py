"""YouTube Data API search helper."""

from __future__ import annotations

import logging
from typing import Any, List

import httpx

from app.config.settings import settings

logger = logging.getLogger(__name__)


async def search_videos(query: str, max_results: int = 5) -> List[dict[str, Any]]:
    if not settings.youtube_api_key:
        return []
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "key": settings.youtube_api_key,
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get("https://www.googleapis.com/youtube/v3/search", params=params)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        logger.warning("YouTube API error: %s", e)
        return []
    out: List[dict[str, Any]] = []
    for item in data.get("items", []):
        vid = item.get("id", {}).get("videoId")
        sn = item.get("snippet", {})
        if vid:
            out.append(
                {
                    "title": sn.get("title", ""),
                    "url": f"https://www.youtube.com/watch?v={vid}",
                    "channel": sn.get("channelTitle", ""),
                }
            )
    return out
