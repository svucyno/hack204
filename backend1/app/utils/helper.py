"""
Shared helpers: identifiers, time, hashing, and small utilities.
"""

import hashlib
import secrets
import string
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_id(prefix: str = "") -> str:
    raw = uuid.uuid4().hex
    return f"{prefix}{raw}" if prefix else raw


def stable_hash(*parts: str) -> str:
    """Deterministic short hash for cache keys or deduplication."""
    joined = "|".join(parts).encode("utf-8")
    return hashlib.sha256(joined).hexdigest()[:16]


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def safe_mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def paginate_slice(items: list[Any], page: int, page_size: int) -> tuple[list[Any], int]:
    total = len(items)
    start = max(0, (page - 1) * page_size)
    end = start + page_size
    return items[start:end], total


def mask_email(email: str) -> str:
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked = "*" * len(local)
    else:
        masked = local[0] + "*" * (len(local) - 2) + local[-1]
    return f"{masked}@{domain}"


def build_log_extra(**kwargs: Any) -> Dict[str, Any]:
    return {k: v for k, v in kwargs.items() if v is not None}


def random_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def slugify(text: str, max_length: int = 64) -> str:
    allowed = string.ascii_lowercase + string.digits + "-"
    s = text.lower().replace(" ", "-")
    return "".join(c for c in s if c in allowed)[:max_length]


# --- JWT helpers (used by route dependencies) ---

try:
    import jwt
except ImportError:  # pragma: no cover
    jwt = None  # type: ignore


def create_access_token(subject: str, role: str = "learner", secret: str = "", algorithm: str = "HS256") -> str:
    if jwt is None:
        raise RuntimeError("PyJWT is required for token creation")
    from datetime import timedelta

    from app.config.settings import settings

    expire = utc_now() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(payload, secret or settings.secret_key, algorithm=algorithm)


def create_refresh_token(subject: str, secret: str = "", algorithm: str = "HS256") -> str:
    if jwt is None:
        raise RuntimeError("PyJWT is required for token creation")
    from datetime import timedelta

    from app.config.settings import settings

    expire = utc_now() + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(subject),
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(payload, secret or settings.secret_key, algorithm=algorithm)


def decode_token(token: str, secret: str = "", algorithm: str = "HS256", expected_type: Optional[str] = None) -> dict:
    if jwt is None:
        raise RuntimeError("PyJWT is required for token decoding")
    from app.config.settings import settings

    payload = jwt.decode(token, secret or settings.secret_key, algorithms=[algorithm])
    if expected_type and payload.get("type") != expected_type:
        raise ValueError("invalid token type")
    return payload
