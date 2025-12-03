# app/config.py
from app.settings import settings

# Базовый URL внешнего спортивного API (OpenLigaDB)
SPORTS_API_BASE_URL: str = settings.api_base_url.rstrip("/")

# Строка с лигами по умолчанию, например: "bl1,apl"
DEFAULT_LEAGUES: str = settings.default_leagues

# Сезон по умолчанию (например, 2024)
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
