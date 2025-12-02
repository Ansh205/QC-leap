from pydantic_settings import BaseSettings
from typing import List, Optional  # <--- Added Optional
import os


class Settings(BaseSettings):
    # Project Info
    PROJECT_NAME: str = "QC-Leap"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 100
    UPLOAD_DIR: str = "uploads"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3100", "http://localhost:8000","http://127.0.0.1:3000","http://127.0.0.1:3100","http://127.0.0.1:8000"]

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6380
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    REDIS_CACHE_TTL: int = 300  # 5 minutes default
    REDIS_URL: str = "redis://localhost:6380/0"

    OPENAI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()