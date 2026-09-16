from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    GEMINI_API_KEY: Optional[str] = ""
    # もし他にも環境変数がある場合はすべて Optional かデフォルト値を指定する
    # 例: PORT: Optional[str] = "8080"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",        # 未定義の環境変数があってもエラーにしない
        case_sensitive=False   # 大文字・小文字を区別しない
    )

settings = Settings()
