import os
import smtplib
import re
import logging
from email.message import EmailMessage
from typing import Optional

logger = logging.getLogger(__name__)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

class EmailService:
    @staticmethod
    def is_valid_email(email: Optional[str]) -> bool:
        if not email or not isinstance(email, str):
            return False
        return bool(EMAIL_REGEX.match(email.strip()))

    @classmethod
    def send_smtp_email(cls, to_email: str, subject: str, body: str) -> bool:
        """
        Sends an email via standard SMTP with TLS/STARTTLS.
        Credentials are retrieved exclusively from environment variables / Settings.
        """
        if not cls.is_valid_email(to_email):
            raise ValueError(f"Invalid or missing recipient email address: '{to_email}'")

        from app.core.config import settings

        smtp_host = os.getenv("SMTP_HOST", getattr(settings, "SMTP_HOST", "smtp.gmail.com"))
        smtp_port = int(os.getenv("SMTP_PORT", str(getattr(settings, "SMTP_PORT", 587))))
        smtp_username = os.getenv("SMTP_USERNAME", getattr(settings, "SMTP_USERNAME", "tejashalvankar2006@gmail.com"))
        smtp_password = os.getenv("SMTP_PASSWORD", getattr(settings, "SMTP_PASSWORD", ""))
        smtp_from = os.getenv("SMTP_FROM_EMAIL", getattr(settings, "SMTP_FROM_EMAIL", "tejashalvankar2006@gmail.com"))

        if not smtp_password:
            raise ValueError(
                "SMTP password is not configured. Please set the SMTP_PASSWORD environment variable in backend/.env"
            )

        msg = EmailMessage()
        msg["From"] = smtp_from
        msg["To"] = to_email.strip()
        msg["Subject"] = subject or "SalesOrbit Customer Communication"
        msg.set_content(body or "")

        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(msg)
            logger.info(f"Successfully sent SMTP email to {to_email}")
            return True
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed for user {smtp_username}")
            raise RuntimeError(f"SMTP authentication error: Invalid credentials for {smtp_username}") from e
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            raise RuntimeError(f"Failed to send email via SMTP ({smtp_host}:{smtp_port}): {str(e)}") from e
