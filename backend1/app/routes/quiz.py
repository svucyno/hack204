"""
Quiz and assessment REST endpoints (MongoDB; questions embedded in assessment).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User, utc_now
from app.db.mongo import get_db
from app.models.schemas import (
    APIError,
    AnswerSubmit,
    ErrorDetail,
    QuestionItem,
    QuestionOption,
    QuestionType,
    QuizGenerateRequest,
    QuizResultRead,
    QuizSessionRead,
    SkillLevel,
)
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quiz", tags=["quiz"])

_ai_service: AIService | None = None


def set_quiz_dependencies(ai: AIService) -> None:
    global _ai_service
    _ai_service = ai


def get_ai() -> AIService:
    if _ai_service is None:
        raise RuntimeError("AIService not initialized")
    return _ai_service


def _map_type_name(t: QuestionType) -> str:
    return "mcq" if t == QuestionType.mcq else "coding"


def _qdict_to_item(q: dict) -> QuestionItem:
    opts = None
    if q.get("options"):
        opts = [QuestionOption(id=o["id"], text=o["text"]) for o in q["options"]]
    qt = QuestionType.mcq if q.get("type") == "mcq" else QuestionType.coding
    return QuestionItem(
        question_id=q["id"],
        topic_id=q["topic_id"],
        type=qt,
        prompt=q["prompt"],
        options=opts,
        difficulty=float(q.get("difficulty", 0.5)),
        starter_code=q.get("starter_code"),
    )


def _find_question(ass: dict, qid: str) -> dict | None:
    for q in ass.get("questions") or []:
        if q.get("id") == qid:
            return q
    return None


@router.post("/session", response_model=QuizSessionRead, status_code=status.HTTP_201_CREATED)
async def start_quiz(
    body: QuizGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    ai: AIService = Depends(get_ai),
) -> QuizSessionRead:
    raw = ai.generate_mcq_questions(body.topic_ids, body.num_questions, body.include_coding)
    aid = str(uuid.uuid4())
    now = utc_now()
    questions: list[dict] = []
    stored: list[QuestionItem] = []
    for i, qr in enumerate(raw):
        qid = str(uuid.uuid4())
        qdoc = {
            "id": qid,
            "topic_id": qr.topic_id,
            "type": _map_type_name(qr.type),
            "prompt": qr.prompt,
            "options": [o.model_dump() for o in (qr.options or [])] or None,
            "correct_option_id": "a",
            "starter_code": qr.starter_code,
            "difficulty": qr.difficulty,
            "order_index": i,
        }
        questions.append(qdoc)
        stored.append(_qdict_to_item(qdoc))
    await db[C.ASSESSMENTS].insert_one(
        {
            "_id": aid,
            "user_id": user.id,
            "title": "Quiz session",
            "kind": "quiz",
            "questions": questions,
            "score_percent": None,
            "classified_level": None,
            "topic_breakdown": None,
            "weak_topics": None,
            "started_at": now,
            "completed_at": None,
        }
    )
    logger.info("Quiz started", extra={"assessment_id": aid})
    return QuizSessionRead(session_id=aid, user_id=str(user.id), questions=stored, started_at=now)


@router.post("/answer", status_code=status.HTTP_200_OK)
async def submit_answer(
    body: AnswerSubmit,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    ai: AIService = Depends(get_ai),
) -> dict:
    ass = await db[C.ASSESSMENTS].find_one({"_id": body.session_id, "user_id": user.id})
    if not ass:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Session not found")).model_dump(),
        )
    q = _find_question(ass, body.question_id)
    if not q:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Question not found")).model_dump(),
        )
    qitem = _qdict_to_item(q)
    score = ai.score_answer(qitem, body.selected_option_id, body.code_submission)
    await db[C.ANSWERS].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "assessment_id": body.session_id,
            "question_id": body.question_id,
            "user_id": user.id,
            "selected_option_id": body.selected_option_id,
            "code_submission": body.code_submission,
            "is_correct": score >= 1.0,
            "score": score,
            "created_at": utc_now(),
        }
    )
    return {"question_id": body.question_id, "score": score}


@router.post("/session/{session_id}/finalize", response_model=QuizResultRead)
async def finalize_quiz(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    ai: AIService = Depends(get_ai),
) -> QuizResultRead:
    ass = await db[C.ASSESSMENTS].find_one({"_id": session_id, "user_id": user.id})
    if not ass:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Session not found")).model_dump(),
        )
    qrows = ass.get("questions") or []
    by_topic: dict[str, list[float]] = {}
    all_scores: list[float] = []
    for q in qrows:
        cur = (
            db[C.ANSWERS]
            .find({"assessment_id": session_id, "question_id": q["id"], "user_id": user.id})
            .sort("created_at", -1)
            .limit(1)
        )
        ans_list = await cur.to_list(length=1)
        s = float(ans_list[0]["score"]) if ans_list else 0.0
        all_scores.append(s)
        by_topic.setdefault(q["topic_id"], []).append(s)
    topic_breakdown = {k: round(sum(v) / len(v) * 100, 2) for k, v in by_topic.items()}
    pct = round(sum(all_scores) / max(1, len(qrows)) * 100, 2)
    weak = ai.weak_topic_prediction({k: v / 100.0 for k, v in topic_breakdown.items()})
    level = ai.classify_skill_level(all_scores, [])
    completed = datetime.now(timezone.utc)
    await db[C.ASSESSMENTS].update_one(
        {"_id": session_id},
        {
            "$set": {
                "score_percent": pct,
                "classified_level": level.value,
                "topic_breakdown": topic_breakdown,
                "weak_topics": weak,
                "completed_at": completed,
            }
        },
    )
    return QuizResultRead(
        session_id=session_id,
        score_percent=pct,
        topic_breakdown=topic_breakdown,
        weak_topics=weak,
        classified_level=level,
        completed_at=completed,
    )


@router.get("/session/{session_id}", response_model=QuizSessionRead)
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> QuizSessionRead:
    ass = await db[C.ASSESSMENTS].find_one({"_id": session_id, "user_id": user.id})
    if not ass:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=APIError(error=ErrorDetail(code="not_found", message="Session not found")).model_dump(),
        )
    items = [_qdict_to_item(q) for q in sorted(ass.get("questions") or [], key=lambda x: x.get("order_index", 0))]
    return QuizSessionRead(
        session_id=str(ass["_id"]),
        user_id=str(user.id),
        questions=items,
        started_at=ass["started_at"],
    )
