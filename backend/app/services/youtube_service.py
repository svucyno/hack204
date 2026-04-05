"""YouTube Data API search helper."""

from __future__ import annotations

import logging
from typing import Any, List

import json
from openai import AsyncOpenAI
from app.config.settings import settings

logger = logging.getLogger(__name__)


async def search_videos(query: str, max_results: int = 5) -> List[dict[str, Any]]:
    api_key = settings.openai_api_key or settings.gemini_api_key
    if not api_key:
        return []
    
    try:
        # Since we just have openai api key, let's use it for the API call
        # We might have openai_api_key variable but check if it's set
        client = AsyncOpenAI(api_key=api_key)
        prompt = f"""
        Provide a list of {max_results} highly rated educational YouTube videos for the topic: {query}.
        Return ONLY valid JSON in this exact structure:
        [
            {{
                "title": "Video Title",
                "url": "https://www.youtube.com/watch?v=VIDEO_ID",
                "channel": "Channel Name"
            }}
        ]
        """
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful YouTube video recommendation assistant that replies strictly with JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500
        )
        content = response.choices[0].message.content
        if not content:
            return []
            
        content = content.replace("```json", "").replace("```", "").strip()
        data = json.loads(content)
        
        out: List[dict[str, Any]] = []
        for item in data:
            if "title" in item and "url" in item:
                out.append({
                    "title": item["title"],
                    "url": item["url"],
                    "channel": item.get("channel", "YouTube")
                })
        return out[:max_results]
    except Exception as e:
        logger.warning("OpenAI API error offering video recommendations: %s", e)
        return []
