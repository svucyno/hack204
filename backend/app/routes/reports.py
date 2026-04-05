"""PDF reports (MongoDB)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user
from app.db import collections as C
from app.db.documents import User
from app.db.mongo import get_db
from app.services.report_service import build_learner_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


from datetime import datetime, timedelta, timezone

@router.get("/progress.pdf")
async def progress_pdf(user: User = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)) -> Response:
    now = datetime.now(timezone.utc)
    # 0 = Monday, 6 = Sunday. To find last Sunday:
    days_since_sunday = (now.weekday() + 1) % 7
    start_of_week = now - timedelta(days=days_since_sunday)
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59)

    p = await db[C.PROFILES].find_one({"user_id": user.id})
    
    # Weekly assessments
    recent_assess = await db[C.ASSESSMENTS].find({
        "user_id": user.id,
        "completed_at": {"$gte": start_of_week, "$lte": end_of_week}
    }).to_list(100)
    
    scores = [a.get("score_percent") for a in recent_assess if a.get("score_percent") is not None]
    avg_score = sum(scores) / len(scores) if scores else 0.0

    sections = [
        ("Account Info", f"{user.full_name} <{user.email}>"),
        ("Goal Focus", (p.get("goals") if p else None) or []),
        ("Week Period", f"{start_of_week.strftime('%b %d, %Y')} - {end_of_week.strftime('%b %d, %Y')}"),
        ("Weekly Assessments Completed", len(scores)),
        ("Weekly Average Score", f"{avg_score:.1f}%"),
    ]
    pdf = build_learner_pdf("Weekly Progress Report", sections)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="weekly-progress-report.pdf"'},
    )
