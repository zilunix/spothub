# app/settings.py
from __future__ import annotations

import os
from pydantic import BaseModel


class Settings(BaseModel):
    """
    Базовые настройки приложения.

    Всё читаем из переменных окружения с разумными дефолтами.
    Никаких pydantic_settings и JSON-значений для complex-типов.
    """

    # Базовый URL внешнего спортивного API (OpenLigaDB)
    # Основная переменная: SPORTS_API_BASE_URL
    api_base_url: str = os.getenv(
        "SPORTS_API_BASE_URL",
        "https://api.openligadb.de",
    )

    # Список лиг по умолчанию (строкой, через запятую).
    # Приоритет:
    #   1) SPORTS_DEFAULT_LEAGUES
    #   2) DEFAULT_LEAGUES
    #   3) "bl1" по умолчанию
    default_leagues: str = (
        os.getenv("SPORTS_DEFAULT_LEAGUES")
        or os.getenv("DEFAULT_LEAGUES", "bl1")
    )

    # Сезон по умолчанию
    default_season: int = int(
        os.getenv("SPORTS_DEFAULT_SEASON")
        or os.getenv("DEFAULT_SEASON", "2024")
    )

    # Диапазон дней для /board
    board_days_back: int = int(os.getenv("BOARD_DAYS_BACK", "3"))
    board_days_ahead: int = int(os.getenv("BOARD_DAYS_AHEAD", "3"))

    # Строка подключения к БД (используется в app.db, если нужно)
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql://sporthub:sporthub-pass@sporthub-postgres:5432/sporthub",
    )


# Глобальный singleton настроек — ЭТО то, что импортирует app.main
settings = Settings()
