from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # LLM
    default_model: str = "openai/gpt-4o-mini"
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    embedding_model: str = "text-embedding-3-small"
    
    # Search
    tavily_api_key: Optional[str] = None
    
    # OAuth
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    github_client_id: Optional[str] = None
    github_client_secret: Optional[str] = None
    
    # JWT
    jwt_secret_key: str = "change-this-to-a-random-secret-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # URLs
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    
    # Storage
    upload_dir: str = "./uploads"
    sqlite_db_path: str = "./data/trove.db"
    chroma_db_path: str = "./data/chroma"
    
    @property
    def database_url(self) -> str:
        return f"sqlite+aiosqlite:///{self.sqlite_db_path}"
    
    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"

settings = Settings()
