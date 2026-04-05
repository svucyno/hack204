"""Filesystem paths shared across modules."""

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = BACKEND_ROOT / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
