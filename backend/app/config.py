from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://nimmt:nimmt@localhost:5432/nimmt"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:5173"
    session_secret: str = "dev-only-change-me"
    log_level: str = "info"

    session_ttl_days: int = 7
    room_ttl_hours: int = 24
    lobby_stale_hours: int = 2
    submit_timeout_seconds: int = 30
    disconnect_grace_seconds: int = 5

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return ",".join(value)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
