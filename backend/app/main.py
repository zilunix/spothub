import logging
from datetime import date
from typing import List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings
from .sports_api import list_leagues, list_matches, list_teams


logger = logging.getLogger(__name__)


class League(BaseModel):
    id: str
    name: str


class Team(BaseModel):
    id: str
    name: str


class Match(BaseModel):
    id: str
    home_team: str
    away_team: str
    start_time: str
    status: str
    score_home: int | None = None
    score_away: int | None = None


app = FastAPI(
    title="SportHub API",
    version="0.1.0",
    description="Простой API для отображения спортивных лиг и матчей (MVP).",
)

# CORS для локальной разработки фронта и доступа из браузера
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Простейшие заглушки на случай проблем с внешним API ----------

FALLBACK_LEAGUES: List[League] = [
    League(id="nhl", name="NHL"),
    League(id="apl", name="APL"),
]

FALLBACK_MATCHES: List[Match] = [
    Match(
        id="sample-1",
        home_team="Team A",
        away_team="Team B",
        start_time="19:00",
        status="scheduled",
        score_home=None,
        score_away=None,
    ),
    Match(
        id="sample-2",
        home_team="Team C",
        away_team="Team D",
        start_time="21:30",
        status="finished",
        score_home=2,
        score_away=1,
    ),
]


# ---------- Эндпоинты ----------


@app.get("/health", summary="Проверка живости")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/leagues", response_model=List[League], summary="Список лиг")
async def get_leagues() -> List[League]:
    """
    Основной путь: забрать лиги из внешнего API через sports_api.list_leagues.
    Если что-то пошло не так (ошибка сети, неверный ключ и т.п.),
    возвращаем заглушки, чтобы фронт не ломался.
    """
    try:
        leagues_raw = await list_leagues()
        if leagues_raw:
            return [League(**l) for l in leagues_raw]
        logger.warning("list_leagues вернул пустой список, используем заглушки")
    except Exception as exc:
        logger.exception("Не удалось получить лиги из внешнего API: %s", exc)

    # fallback
    return FALLBACK_LEAGUES


@app.get("/teams", response_model=List[Team], summary="Список команд лиги")
async def get_teams(league: str = Query(..., description="ID лиги")) -> List[Team]:
    """
    Этот эндпоинт фронт сейчас не использует, но оставляем как есть.
    В случае ошибки также можем вернуть пустой список, чтобы не падать.
    """
    try:
        teams_raw = await list_teams(league)
        return [Team(**t) for t in teams_raw]
    except Exception as exc:
        logger.exception("Не удалось получить команды для лиги %s: %s", league, exc)
        return []


@app.get("/matches", response_model=List[Match], summary="Матчи лиги на дату")
async def get_matches(
    league: str = Query(..., description="ID лиги, например nhl или apl"),
    date_str: str = Query(
        default=date.today().isoformat(), description="Дата в формате YYYY-MM-DD"
    ),
) -> List[Match]:
    """
    Основной путь: обращаемся к внешнему API через list_matches.
    Если дата некорректна — выбрасываем 400.
    Если внешний API падает — логируем и отдаём заглушечные матчи.
    """
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(
            status_code=400, detail="Некорректная дата, нужен формат YYYY-MM-DD"
        )

    try:
        matches_raw = await list_matches(league, d)
        if matches_raw:
            return [Match(**m) for m in matches_raw]
        logger.warning(
            "list_matches вернул пустой список для лиги %s и даты %s, используем заглушки",
            league,
            date_str,
        )
    except Exception as exc:
        logger.exception(
            "Не удалось получить матчи из внешнего API для лиги %s и даты %s: %s",
            league,
            date_str,
            exc,
        )

    # fallback: сейчас не фильтруем по лиге/дате, просто отдаём набор тестовых матчей
    return FALLBACK_MATCHES


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"message": "SportHub API. См. /docs"}
