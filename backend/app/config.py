# app/config.py
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GEMINI_API_KEY: Optional[str] = ""

    class Config:
        env_file = ".env"
        extra = "ignore"  # 未定義の環境変数があってもエラーにしない

settings = Settings()

