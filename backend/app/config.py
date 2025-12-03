import os
from pydantic import BaseModel


class Settings(BaseModel):
    # Настройки по умолчанию берём из ENV, но уже с нужными дефолтами под OpenLigaDB
    sports_api_base_url: str = os.getenv(
        "SPORTS_API_BASE_URL",
        "https://api.openligadb.de",
    )
    sports_api_key: str | None = os.getenv("SPORTS_API_KEY")

    # Для OpenLigaDB корректный шорткат, например bl1 (Бундеслига)
    # Можно задать через ENV: DEFAULT_LEAGUES="bl1,bl2"
    default_leagues: str = os.getenv("DEFAULT_LEAGUES", "bl1")

    # Сезон по умолчанию (стартовый год, например 2024 для сезона 2024/2025)
    default_season: int = int(os.getenv("DEFAULT_SEASON", "2024"))

    # Для /board: сколько дней назад/вперёд смотреть матчи
    # Можно переопределить через ENV: BOARD_DAYS_BACK / BOARD_DAYS_AHEAD
    board_days_back: int = int(os.getenv("BOARD_DAYS_BACK", "3"))
    board_days_ahead: int = int(os.getenv("BOARD_DAYS_AHEAD", "3"))


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

# Настройки диапазона для доски матчей (/board)
BOARD_DAYS_BACK: int = settings.board_days_back
BOARD_DAYS_AHEAD: int = settings.board_days_ahead


def get_default_leagues_list() -> list[str]:
    """
    Вернуть DEFAULT_LEAGUES как список шорткатов.
    Пример: "bl1,apl" -> ["bl1", "apl"]
    """
    return [s.strip().lower() for s in DEFAULT_LEAGUES.split(",") if s.strip()]
