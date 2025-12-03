# backend/app/settings.py
from __future__ import annotations

from typing import List, Any

try:
    # Pydantic v2
    from pydantic_settings import BaseSettings
    from pydantic import AnyHttpUrl, field_validator
    _V2 = True
except Exception:
    # Pydantic v1
    from pydantic import BaseSettings, AnyHttpUrl, validator
    _V2 = False


class Settings(BaseSettings):
    # Важно: имена полей без "sports_" — чтобы env_prefix="SPORTS_" дал ровно SPORTS_API_BASE_URL и т.д.
    api_base_url: AnyHttpUrl = "https://www.openligadb.de/api"
    default_leagues: List[str] = ["bl1"]
    default_season: int = 2024
    board_days_ahead: int = 3
    board_days_back: int = 3

    if _V2:
        @field_validator("default_leagues", mode="before")
        @classmethod
        def _parse_leagues(cls, v: Any) -> Any:
            if isinstance(v, str):
                return [x.strip() for x in v.split(",") if x.strip()]
            return v
    else:
        @validator("default_leagues", pre=True)
        def _parse_leagues(cls, v: Any) -> Any:
            if isinstance(v, str):
                return [x.strip() for x in v.split(",") if x.strip()]
            return v

    class Config:
        env_prefix = "SPORTS_"
        case_sensitive = False


settings = Settings()
