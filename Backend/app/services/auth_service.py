"""Authentication: register, login, refresh, password reset, Google OAuth."""

from __future__ import annotations

import hashlib
import logging
import uuid
from typing import Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import PASSWORD_RESET_TTL_SECONDS
from app.core.cache import cache_key, cache_delete, cache_get, cache_set
from app.core.security import hash_password, verify_password
from app.db import collections as C
from app.db.documents import OAuthProvider, User, UserRole, utc_now
from app.utils.helper import create_access_token, create_refresh_token, decode_token, random_token

logger = logging.getLogger(__name__)


def _hash_refresh(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[User]:
    doc = await db[C.USERS].find_one({"email": email.lower().strip()})
    return User.from_doc(doc) if doc else None


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> Optional[User]:
    doc = await db[C.USERS].find_one({"_id": user_id})
    return User.from_doc(doc) if doc else None


async def register_user(db: AsyncIOMotorDatabase, email: str, password: str, full_name: str) -> User:
    if await get_user_by_email(db, email):
        raise ValueError("email_taken")
    uid = str(uuid.uuid4())
    now = utc_now()
    await db[C.USERS].insert_one(
        {
            "_id": uid,
            "email": email.lower().strip(),
            "hashed_password": hash_password(password),
            "full_name": full_name,
            "role": UserRole.learner.value,
            "is_active": True,
            "oauth_provider": OAuthProvider.local.value,
            "oauth_sub": None,
            "refresh_token_hash": None,
            "created_at": now,
            "updated_at": now,
        }
    )
    u = await get_user_by_id(db, uid)
    assert u is not None
    return u


async def authenticate_local(db: AsyncIOMotorDatabase, email: str, password: str) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user or not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def issue_tokens(db: AsyncIOMotorDatabase, user: User) -> Tuple[str, str]:
    access = create_access_token(str(user.id), role=user.role.value)
    refresh = create_refresh_token(str(user.id))
    await db[C.USERS].update_one(
        {"_id": user.id},
        {"$set": {"refresh_token_hash": _hash_refresh(refresh), "updated_at": utc_now()}},
    )
    return access, refresh


async def refresh_session(db: AsyncIOMotorDatabase, refresh_token: str) -> Tuple[str, str]:
    payload = decode_token(refresh_token, expected_type="refresh")
    uid = str(payload["sub"])
    user = await get_user_by_id(db, uid)
    if not user or not user.is_active or not user.refresh_token_hash:
        raise ValueError("invalid_refresh")
    if user.refresh_token_hash != _hash_refresh(refresh_token):
        raise ValueError("invalid_refresh")
    return await issue_tokens(db, user)


async def forgot_password_start(db: AsyncIOMotorDatabase, email: str) -> Optional[str]:
    user = await get_user_by_email(db, email)
    if not user or user.oauth_provider != OAuthProvider.local:
        return None
    token = random_token(24)
    key = cache_key("pwdreset", token)
    await cache_set(key, str(user.id), ttl=PASSWORD_RESET_TTL_SECONDS)
    return token


async def reset_password_finish(db: AsyncIOMotorDatabase, token: str, new_password: str) -> None:
    key = cache_key("pwdreset", token)
    uid = await cache_get(key)
    if not uid:
        raise ValueError("invalid_or_expired_token")
    user = await get_user_by_id(db, uid)
    if not user:
        raise ValueError("user_not_found")
    await db[C.USERS].update_one(
        {"_id": user.id},
        {"$set": {"hashed_password": hash_password(new_password), "refresh_token_hash": None, "updated_at": utc_now()}},
    )
    await cache_delete(key)


async def upsert_google_user(db: AsyncIOMotorDatabase, email: str, full_name: str, sub: str) -> User:
    doc = await db[C.USERS].find_one({"oauth_sub": sub})
    if doc:
        return User.from_doc(doc)
    user = await get_user_by_email(db, email)
    if user:
        await db[C.USERS].update_one(
            {"_id": user.id},
            {"$set": {"oauth_provider": OAuthProvider.google.value, "oauth_sub": sub, "updated_at": utc_now()}},
        )
        u = await get_user_by_id(db, user.id)
        assert u is not None
        return u
    uid = str(uuid.uuid4())
    now = utc_now()
    await db[C.USERS].insert_one(
        {
            "_id": uid,
            "email": email.lower().strip(),
            "full_name": full_name or email.split("@")[0],
            "hashed_password": None,
            "oauth_provider": OAuthProvider.google.value,
            "oauth_sub": sub,
            "role": UserRole.learner.value,
            "is_active": True,
            "refresh_token_hash": None,
            "created_at": now,
            "updated_at": now,
        }
    )
    u = await get_user_by_id(db, uid)
    assert u is not None
    return u


async def verify_google_id_token(id_token: str, client_id: str) -> dict:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    if not client_id:
        raise ValueError("google_not_configured")
    info = google_id_token.verify_oauth2_token(id_token, google_requests.Request(), client_id)
    return info
