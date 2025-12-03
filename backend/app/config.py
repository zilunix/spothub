import os
from pydantic import BaseModel


class Settings(BaseModel):
    # Настройки по умолчанию берём из ENV, но уже с нужными дефолтами под OpenLigaDB
    sports_api_base_url: str = os.getenv("SPORTS_API_BASE_URL", "https://api.openligadb.de")
    sports_api_key: str | None = os.getenv("SPORTS_API_KEY")
    # Для OpenLigaDB корректный шорткат, например bl1 (Бундеслига)
    default_leagues: str = os.getenv("DEFAULT_LEAGUES", "bl1")
    # Сезон по умолчанию
    default_season: int = int(os.getenv("DEFAULT_SEASON", "2024"))


# Один объект с настройками, если где-то ещё он используется
settings = Settings()

# ==== Удобные верхнеуровневые константы для остального кода ====

# Базовый URL внешнего спортивного API (OpenLigaDB)
SPORTS_API_BASE_URL: str = settings.sports_api_base_url.rstrip("/")

# Список лиг по умолчанию через запятую (leagueShortcut из OpenLigaDB)
# Например: "bl1,bl2" — 1 и 2 Бундеслига
DEFAULT_LEAGUES: str = settings.default_leagues

# Стартовый год сезона по умолчанию (2024/2025 -> 2024)
DEFAULT_SEASON: int = settings.default_season


def get_default_leagues_list() -> list[str]:
    """
    Вернуть DEFAULT_LEAGUES как список шорткатов.
    Пример: "bl1,apl" -> ["bl1", "apl"]
    """
    return [s.strip().lower() for s in DEFAULT_LEAGUES.split(",") if s.strip()]
