"""
Analytics: dashboard metrics, time usage, mastery, weakness radar, forecasting stub.
"""

from __future__ import annotations

import logging
import math
from typing import Dict, List, Optional

from app.models.schemas import (
    DashboardAnalytics,
    LearningPathRead,
    TimeAnalytics,
)
from app.services.ai_service import AIService
from app.utils.helper import clamp, safe_mean, utc_now

logger = logging.getLogger(__name__)


class AnalysisService:
    def __init__(self, ai: AIService) -> None:
        self._ai = ai

    def build_dashboard(
        self,
        user_id: str,
        topic_scores: Dict[str, float],
        minutes_by_topic: Dict[str, float],
        streak_days: int,
        completion_percent: float,
        days: int = 30,
    ) -> DashboardAnalytics:
        mastery, weakness = self._ai.mastery_and_weakness(topic_scores)
        total_minutes = sum(minutes_by_topic.values()) or float(days * 20)
        time_block = TimeAnalytics(
            total_minutes=round(total_minutes, 2),
            by_topic={k: round(v, 2) for k, v in minutes_by_topic.items()},
            streak_days=streak_days,
        )
        conf = clamp(safe_mean(list(topic_scores.values())) if topic_scores else 0.4)
        return DashboardAnalytics(
            user_id=user_id,
            completion_percent=clamp(completion_percent, 0, 100),
            learning_streak_days=streak_days,
            topic_mastery=mastery,
            weakness_radar=weakness,
            time_analytics=time_block,
            confidence_score=conf,
        )

    def forecast_completion_weeks(self, path: LearningPathRead, hours_studied_per_week: float) -> float:
        if hours_studied_per_week <= 0:
            return math.inf
        return round(path.total_estimated_hours / hours_studied_per_week, 2)

    def low_retention_topics(self, topic_scores: Dict[str, float], threshold: float = 0.45) -> List[str]:
        return [k for k, v in topic_scores.items() if v < threshold]

    def adaptive_feedback_summary(
        self,
        user_id: str,
        last_quiz_percent: float,
        path: Optional[LearningPathRead] = None,
    ) -> Dict[str, object]:
        """Human-readable adaptive signals for clients (path revision hints)."""
        hints: List[str] = []
        if last_quiz_percent < 55:
            hints.append("Repeat weakest topics and shorten daily load.")
        elif last_quiz_percent > 85:
            hints.append("Increase difficulty or add stretch projects.")
        else:
            hints.append("Maintain pace; mix review with new modules.")
        regen = last_quiz_percent < 50 or last_quiz_percent > 90
        logger.info("Adaptive feedback", extra={"user_id": user_id, "regen": regen})
        out: Dict[str, object] = {
            "user_id": user_id,
            "hints": hints,
            "suggest_path_regeneration": regen,
            "evaluated_at": utc_now().isoformat(),
        }
        if path:
            out["estimated_weeks_at_10h"] = self.forecast_completion_weeks(path, 10.0)
        return out
