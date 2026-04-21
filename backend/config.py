"""Application configuration loaded from environment variables."""

import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Load .env from project root (one level up from backend/)
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./teaching_app.db"

    # Azure OpenAI — two keys for parallel usage
    AZURE_API_KEY: str = ""
    AZURE_API_KEY_2: str = ""
    AZURE_API_BASE: str = ""
    AZURE_API_VERSION: str = "2024-10-21"
    AZURE_DEPLOYMENT_NAME: str = "gpt-4o-mini"
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT: str = "text-embedding-ada-002"

    # App
    APP_NAME: str = "AI Teacher Session Prep Portal"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:2708"

    # Prep constraints
    MAX_PREP_TIME_MINUTES: int = 30

    # Chunking
    CHUNK_MAX_TOKENS: int = 2000
    CHUNK_OVERLAP_TOKENS: int = 200

    model_config = {
        "env_file": str(ENV_PATH),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
