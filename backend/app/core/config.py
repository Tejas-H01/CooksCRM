import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    DATABASE_URL: str = "postgresql://postgres:postgrespassword@localhost:5432/crm_db"
    SECRET_KEY: str = "dev_secret_key_change_in_production"

    # Engine Settings
    HIGH_VALUE_THRESHOLD: float = 500000.00
    SIGNIFICANT_PAYIN_THRESHOLD: float = 500000.00
    HIGH_INTENT_WINDOW_MINUTES: int = 120

    # Priority Weights
    WEIGHT_URGENCY: float = 0.30
    WEIGHT_OPPORTUNITY_VALUE: float = 0.25
    WEIGHT_SLA_RISK: float = 0.20
    WEIGHT_CUSTOMER_IMPORTANCE: float = 0.15
    WEIGHT_INTENT: float = 0.10

    model_config = SettingsConfigDict(
        # Allow loading env files relative to the backend workspace
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
