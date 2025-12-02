"""
Простейший слой для работы с внешним спортивным API.

В текущем MVP он возвращает статические данные.
Позже сюда можно добавить реальные запросы к бесплатным спортивным API через httpx.
"""
from datetime import date
from typing import Any, Dict, List


# Заглушечные данные
LEAGUES = [
    {"id": "nhl", "name": "NHL"},
    {"id": "apl", "name": "English Premier League"},
]

TEAMS = {
    "nhl": [
        {"id": "nyr", "name": "New York Rangers"},
        {"id": "pit", "name": "Pittsburgh Penguins"},
    ],
    "apl": [
        {"id": "ars", "name": "Arsenal"},
        {"id": "liv", "name": "Liverpool"},
    ],
}

MATCHES = {
    # ключ: (league, date_iso)
    ("nhl", "2025-12-01"): [
        {
            "id": "nhl-2025-12-01-1",
            "home_team": "New York Rangers",
            "away_team": "Pittsburgh Penguins",
            "start_time": "19:00",
            "status": "scheduled",
            "score_home": None,
            "score_away": None,
        }
    ],
    ("apl", "2025-12-01"): [
        {
            "id": "apl-2025-12-01-1",
            "home_team": "Arsenal",
            "away_team": "Liverpool",
            "start_time": "20:00",
            "status": "scheduled",
            "score_home": None,
            "score_away": None,
        }
    ],
}


async def list_leagues() -> List[Dict[str, Any]]:
    # В будущем здесь может быть настоящий запрос к внешнему API
    return LEAGUES


async def list_teams(league: str) -> List[Dict[str, Any]]:
    return TEAMS.get(league, [])


async def list_matches(league: str, on_date: date) -> List[Dict[str, Any]]:
    key = (league, on_date.isoformat())
    return MATCHES.get(key, [])
