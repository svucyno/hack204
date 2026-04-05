"""
Optional reinforcement-learning hook for policy-based next-topic selection.

This module documents the extension point; swap `select_action` with a trained
policy (e.g. gymnasium env over learning states) when you have trajectories.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass
class LearningState:
    weak_topics: List[str]
    streak_days: int
    last_score: float


def select_action(state: LearningState, available_topics: List[str]) -> str:
    """Greedy heuristic baseline until an RL policy is plugged in."""
    if not available_topics:
        return "review"
    if state.weak_topics:
        for t in state.weak_topics:
            if t in available_topics:
                return t
    return available_topics[0]
