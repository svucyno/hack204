"""
Domain types and helpers for MongoDB documents (replacing SQLAlchemy ORM models).
"""

from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Optional


class UserRole(str, enum.Enum):
    learner = "learner"
    admin = "admin"


class OAuthProvider(str, enum.Enum):
    local = "local"
    google = "google"


class AssessmentKind(str, enum.Enum):
    diagnostic = "diagnostic"
    quiz = "quiz"


@dataclass
class User:
    id: str
    email: str
    hashed_password: Optional[str]
    full_name: str
    role: UserRole
    is_active: bool
    oauth_provider: OAuthProvider
    oauth_sub: Optional[str]
    refresh_token_hash: Optional[str]

    @classmethod
    def from_doc(cls, d: dict[str, Any]) -> User:
        return cls(
            id=str(d["_id"]),
            email=d["email"],
            hashed_password=d.get("hashed_password"),
            full_name=d.get("full_name") or "",
            role=UserRole(d.get("role", "learner")),
            is_active=d.get("is_active", True),
            oauth_provider=OAuthProvider(d.get("oauth_provider", "local")),
            oauth_sub=d.get("oauth_sub"),
            refresh_token_hash=d.get("refresh_token_hash"),
        )


def utc_now() -> datetime:
    from datetime import timezone

    return datetime.now(timezone.utc)
