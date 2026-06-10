from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SnapURL"
    DEBUG: bool = False
    BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/snapurl"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Short code
    SHORT_CODE_LENGTH: int = 7
    MAX_CUSTOM_ALIAS_LENGTH: int = 32
    MIN_CUSTOM_ALIAS_LENGTH: int = 3

    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # URL expiry (days, 0 = never)
    DEFAULT_EXPIRY_DAYS: int = 0

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
