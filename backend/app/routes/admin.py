"""Admin panel (MongoDB)."""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.deps import get_current_user, require_admin
from app.core.paths import UPLOAD_ROOT
from app.db import collections as C
from app.db.documents import User, utc_now
from app.db.mongo import get_db
from app.models.schemas import AdminStatsResponse, CourseCreate, CourseRead, PaginatedMeta
from app.routes.auth import _public
from app.services import auth_service
from app.services.notification_jobs import notify_user

router = APIRouter(prefix="/admin", tags=["admin"])


async def _log_admin(
    db: AsyncIOMotorDatabase,
    admin_id: str,
    action: str,
    target_type: str | None,
    target_id: str | None,
    meta: dict,
) -> None:
    await db[C.ADMIN_LOGS].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "admin_user_id": admin_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "meta": meta,
            "created_at": utc_now(),
        }
    )


@router.get("/stats", response_model=AdminStatsResponse)
async def stats(admin: User = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)) -> AdminStatsResponse:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    total_users = await db[C.USERS].count_documents({})
    active = await db[C.USERS].count_documents({"created_at": {"$gte": week_ago}})
    assessments = await db[C.ASSESSMENTS].count_documents({"completed_at": {"$gte": week_ago}})
    paths = await db[C.LEARNING_PATHS].count_documents({"created_at": {"$gte": week_ago}})
    return AdminStatsResponse(
        total_users=total_users,
        active_learners_7d=active,
        assessments_completed_7d=assessments,
        paths_created_7d=paths,
    )


@router.get("/users")
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = None,
    q: str | None = None,
) -> dict:
    filt: dict = {}
    if role:
        filt["role"] = role
    if q:
        filt["email"] = {"$regex": re.escape(q), "$options": "i"}
    total = await db[C.USERS].count_documents(filt)
    cursor = db[C.USERS].find(filt).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    docs = await cursor.to_list(length=page_size)
    return {
        "items": [_public(User.from_doc(d)).model_dump() for d in docs],
        "meta": PaginatedMeta(page=page, page_size=page_size, total=total).model_dump(),
    }


@router.patch("/users/{user_id}/role")
async def set_user_role(
    user_id: str,
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    u = await auth_service.get_user_by_id(db, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="not found")
    new_role = body.get("role")
    if new_role not in ("learner", "admin"):
        raise HTTPException(status_code=400, detail="invalid role")
    await db[C.USERS].update_one({"_id": user_id}, {"$set": {"role": new_role, "updated_at": utc_now()}})
    await _log_admin(db, admin.id, "user_role_change", "user", user_id, {"role": new_role})
    return {"detail": "updated"}


@router.post("/users/{user_id}/notify")
async def admin_notify(
    user_id: str,
    body: dict,
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    title = str(body.get("title", "Notice"))
    msg = str(body.get("body", ""))
    await notify_user(db, user_id, title, msg, kind="admin")
    await _log_admin(db, admin.id, "notify_user", "user", user_id, {})
    return {"detail": "sent"}


@router.post("/courses", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
async def create_course(
    body: CourseCreate,
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> CourseRead:
    cid = str(uuid.uuid4())
    now = utc_now()
    doc = {
        "_id": cid,
        "title": body.title,
        "description": body.description,
        "provider": body.provider,
        "external_url": body.external_url,
        "skill_tags": body.skill_tags,
        "is_published": True,
        "created_at": now,
        "updated_at": now,
    }
    await db[C.COURSES].insert_one(doc)
    await _log_admin(db, admin.id, "course_create", "course", cid, {})
    return CourseRead(
        id=cid,
        title=body.title,
        description=body.description,
        provider=body.provider,
        external_url=body.external_url,
        skill_tags=body.skill_tags,
        is_published=True,
        created_at=now,
    )


@router.get("/courses")
async def list_courses(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    total = await db[C.COURSES].count_documents({})
    cursor = db[C.COURSES].find({}).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    rows = await cursor.to_list(length=page_size)
    items = [
        CourseRead(
            id=str(c["_id"]),
            title=c["title"],
            description=c.get("description"),
            provider=c.get("provider", "custom"),
            external_url=c.get("external_url"),
            skill_tags=list(c.get("skill_tags") or []),
            is_published=c.get("is_published", True),
            created_at=c["created_at"],
        ).model_dump()
        for c in rows
    ]
    return {"items": items, "meta": PaginatedMeta(page=page, page_size=page_size, total=total).model_dump()}


@router.post("/resources/upload")
async def upload_resource(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
    file: UploadFile = File(...),
) -> dict:
    safe = (file.filename or "upload").replace("..", "").replace("/", "_")[:200]
    dest = UPLOAD_ROOT / f"{uuid.uuid4().hex}_{safe}"
    content = await file.read()
    dest.write_bytes(content)
    await _log_admin(db, admin.id, "resource_upload", "file", str(dest.name), {"size": len(content)})
    return {"filename": dest.name, "path": f"/uploads/{dest.name}"}


@router.get("/logs")
async def admin_logs(
    admin: User = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
) -> dict:
    total = await db[C.ADMIN_LOGS].count_documents({})
    cursor = (
        db[C.ADMIN_LOGS].find({}).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    )
    rows = await cursor.to_list(length=page_size)
    return {
        "items": [
            {
                "id": str(l["_id"]),
                "admin_user_id": l.get("admin_user_id"),
                "action": l["action"],
                "target_type": l.get("target_type"),
                "target_id": l.get("target_id"),
                "meta": l.get("meta") or {},
                "created_at": l["created_at"].isoformat(),
            }
            for l in rows
        ],
        "meta": PaginatedMeta(page=page, page_size=page_size, total=total).model_dump(),
    }


@router.get("/learners/{user_id}/report")
async def learner_report(user_id: str, admin: User = Depends(require_admin), db: AsyncIOMotorDatabase = Depends(get_db)) -> dict:
    paths = await db[C.LEARNING_PATHS].count_documents({"user_id": user_id})
    done = await db[C.ASSESSMENTS].count_documents({"user_id": user_id, "completed_at": {"$exists": True}})
    notes = await db[C.NOTIFICATIONS].count_documents({"user_id": user_id})
    return {"user_id": user_id, "learning_paths": paths, "assessments_completed": done, "notifications": notes}
