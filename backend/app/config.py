import os
from pydantic import BaseModel


class Settings(BaseModel):
    sports_api_base_url: str = os.getenv("SPORTS_API_BASE_URL", "")
    sports_api_key: str | None = os.getenv("SPORTS_API_KEY")
    default_leagues: str = os.getenv("DEFAULT_LEAGUES", "nhl,apl")


settings = Settings()
