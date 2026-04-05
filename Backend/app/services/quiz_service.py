"""
Quiz session lifecycle: generation, submission, scoring, persistence (in-memory for this slice).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from app.models.schemas import (
    AnswerSubmit,
    QuestionItem,
    QuizGenerateRequest,
    QuizResultRead,
    QuizSessionRead,
    SkillLevel,
)
from app.services.ai_service import AIService
from app.utils.helper import generate_id, utc_now

logger = logging.getLogger(__name__)


@dataclass
class _SessionState:
    session_id: str
    user_id: str
    questions: List[QuestionItem]
    started_at: datetime
    answers: Dict[str, float] = field(default_factory=dict)


class QuizService:
    def __init__(self, ai: AIService) -> None:
        self._ai = ai
        self._sessions: Dict[str, _SessionState] = {}

    def start_session(self, user_id: str, body: QuizGenerateRequest) -> QuizSessionRead:
        questions = self._ai.generate_mcq_questions(
            body.topic_ids,
            body.num_questions,
            body.include_coding,
        )
        sid = generate_id("sess-")
        started = utc_now()
        self._sessions[sid] = _SessionState(session_id=sid, user_id=user_id, questions=questions, started_at=started)
        logger.info("Quiz session started", extra={"session_id": sid, "user_id": user_id})
        return QuizSessionRead(session_id=sid, user_id=user_id, questions=questions, started_at=started)

    def submit_answer(self, user_id: str, body: AnswerSubmit) -> Dict[str, float]:
        sess = self._sessions.get(body.session_id)
        if not sess or sess.user_id != user_id:
            raise KeyError("session_not_found")
        qmap = {q.question_id: q for q in sess.questions}
        q = qmap.get(body.question_id)
        if not q:
            raise KeyError("question_not_found")
        score = self._ai.score_answer(q, body.selected_option_id, body.code_submission)
        sess.answers[body.question_id] = score
        return {"question_id": body.question_id, "score": score}

    def finalize_session(self, user_id: str, session_id: str) -> QuizResultRead:
        sess = self._sessions.get(session_id)
        if not sess or sess.user_id != user_id:
            raise KeyError("session_not_found")
        by_topic: Dict[str, List[float]] = {}
        for q in sess.questions:
            s = sess.answers.get(q.question_id, 0.0)
            by_topic.setdefault(q.topic_id, []).append(s)
        topic_breakdown = {k: round(sum(v) / len(v) * 100, 2) for k, v in by_topic.items()}
        all_scores = [sess.answers.get(q.question_id, 0.0) for q in sess.questions]
        pct = round(sum(all_scores) / max(1, len(sess.questions)) * 100, 2)
        weak = self._ai.weak_topic_prediction({k: v / 100.0 for k, v in topic_breakdown.items()})
        level = self._ai.classify_skill_level(all_scores, [])
        result = QuizResultRead(
            session_id=session_id,
            score_percent=pct,
            topic_breakdown=topic_breakdown,
            weak_topics=weak,
            classified_level=level,
            completed_at=utc_now(),
        )
        logger.info("Quiz finalized", extra={"session_id": session_id, "score": pct})
        return result

    def get_session(self, user_id: str, session_id: str) -> Optional[QuizSessionRead]:
        sess = self._sessions.get(session_id)
        if not sess or sess.user_id != user_id:
            return None
        return QuizSessionRead(
            session_id=sess.session_id,
            user_id=sess.user_id,
            questions=sess.questions,
            started_at=sess.started_at,
        )
