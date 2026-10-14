import pytest
from unittest.mock import patch, MagicMock
from app.services.email_service import EmailService

def test_email_validation():
    assert EmailService.is_valid_email("customer@example.com") is True
    assert EmailService.is_valid_email("user.name+tag@domain.co.in") is True
    assert EmailService.is_valid_email("") is False
    assert EmailService.is_valid_email(None) is False
    assert EmailService.is_valid_email("invalid-email") is False

def test_smtp_missing_password(monkeypatch):
    monkeypatch.setenv("SMTP_PASSWORD", "")
    with pytest.raises(ValueError, match="SMTP password is not configured"):
        EmailService.send_smtp_email("test@example.com", "Test Subject", "Test Body")

@patch("smtplib.SMTP")
def test_smtp_send_success(mock_smtp, monkeypatch):
    monkeypatch.setenv("SMTP_PASSWORD", "secret_app_password")
    
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server

    res = EmailService.send_smtp_email("customer@example.com", "Welcome", "Hello Customer")
    
    assert res is True
    mock_smtp.assert_called_once_with("smtp.gmail.com", 587, timeout=15)
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with("tejashalvankar2006@gmail.com", "secret_app_password")
    mock_server.send_message.assert_called_once()
