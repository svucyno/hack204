"""Email notifications (SMTP or console fallback)."""

from __future__ import annotations

import logging

from app.config.settings import settings

logger = logging.getLogger(__name__)


async def send_email(to_email: str, subject: str, body: str) -> None:
    if not settings.smtp_host:
        logger.info("Email (no SMTP): to=%s subject=%s\n%s", to_email, subject, body)
        return
    try:
        import aiosmtplib
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["From"] = settings.smtp_from
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=True,
        )
    except Exception as e:
        logger.exception("SMTP send failed: %s", e)
        logger.info("Fallback log to=%s: %s", to_email, body)
