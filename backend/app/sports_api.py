# app/sports_api.py
from __future__ import annotations

import datetime as dt
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from . import config as cfg
from .openligadb_client import Match, OpenLigaDBClient
from .schemas.match import MatchSummary, MatchStatus, classify_match

router = APIRouter(prefix="/api", tags=["sports"])

logger = logging.getLogger(__name__)


async def get_client() -> OpenLigaDBClient:
    """Dependency для DI клиента OpenLigaDB."""
    return OpenLigaDBClient()


# ================== /leagues ==================


@router.get("/leagues")
async def get_leagues(
    client: OpenLigaDBClient = Depends(get_client),
) -> List[dict]:
    """
    Список лиг, которые мы хотим показывать на фронте.

    Шорткаты берём из config.DEFAULT_LEAGUES (например, 'bl1,bl2').

    Фронтенд ожидает просто массив объектов.
    """
    shortcuts = cfg.get_default_leagues_list()
    if not shortcuts:
        raise HTTPException(status_code=500, detail="DEFAULT_LEAGUES is not configured")

    try:
        leagues = await client.get_leagues(shortcuts)
        # ВАЖНО: возвращаем чистый список, без обёртки {"items": ...}
        return leagues
    except Exception as exc:
        logger.exception("Не удалось получить лиги из OpenLigaDB: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при обращении к внешнему API OpenLigaDB",
        )


# ================== /matches ==================


@router.get("/matches")
async def get_matches(
    league: str,
    date_str: str = Query(..., description="Дата в формате YYYY-MM-DD"),
    client: OpenLigaDBClient = Depends(get_client),
) -> List[dict]:
    """
    Матчи выбранной лиги на указанную дату.

    Фронтенд ожидает просто массив матчей.
    """
    # валидируем дату
    try:
        date = dt.date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="date_str must be in format YYYY-MM-DD")

    try:
        matches: List[Match] = await client.get_matches_for_date(
            league=league,
            date=date,
            season=cfg.DEFAULT_SEASON,
        )
        # ВАЖНО: возвращаем список dict, без {"items": ...}
        return [m.model_dump() for m in matches]
    except Exception as exc:
        logger.exception(
            "Не удалось получить матчи из OpenLigaDB (league=%s, date=%s): %s",
            league,
            date_str,
            exc,
        )
        raise HTTPException(
            status_code=502,
            detail="Ошибка при обращении к внешнему API OpenLigaDB",
        )


# ================== /board ==================


class BoardResponse(BaseModel):
    date_from: dt.date
    date_to: dt.date
    leagues: List[str]
    recent: List[MatchSummary]
    live: List[MatchSummary]
    upcoming: List[MatchSummary]


@router.get(
    "/board",
    response_model=BoardResponse,
    summary="Сводка матчей по диапазону дат и лигам по умолчанию",
)
async def get_board(
    days_back: int = Query(
        default=cfg.BOARD_DAYS_BACK,
        ge=0,
        le=30,
        description="Сколько дней назад смотреть матчи",
    ),
    days_ahead: int = Query(
        default=cfg.BOARD_DAYS_AHEAD,
        ge=0,
        le=30,
        description="Сколько дней вперёд смотреть матчи",
    ),
    client: OpenLigaDBClient = Depends(get_client),
) -> BoardResponse:
    """
    Эндпоинт /board: live / upcoming / recent матчи.

    Берём сезоны для лиг по умолчанию (DEFAULT_LEAGUES, DEFAULT_SEASON),
    загружаем все матчи сезона и классифицируем их.
    """
    now = dt.datetime.now(dt.timezone.utc)

    leagues = cfg.get_default_leagues_list()
    season = cfg.DEFAULT_SEASON

    all_matches: List[MatchSummary] = []

    try:
        # Для каждой лиги тянем матчи сезона и классифицируем
        for lg in leagues:
            raw_matches = await client.get_season_raw(lg, season)
            for rm in raw_matches:
                ms = classify_match(rm, now)
                all_matches.append(ms)
    except Exception as exc:
        logger.exception("Не удалось получить матчи для /board из OpenLigaDB: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при обращении к внешнему API OpenLigaDB (board)",
        )

    ahead = days_ahead
    back = days_back

    live: List[MatchSummary] = []
    upcoming: List[MatchSummary] = []
    recent: List[MatchSummary] = []

    for m in all_matches:
        if m.status == MatchStatus.LIVE:
            live.append(m)
        elif m.status == MatchStatus.SCHEDULED:
            if now <= m.kickoff_utc <= now + dt.timedelta(days=ahead):
                upcoming.append(m)
        elif m.status == MatchStatus.FINISHED:
            if now - dt.timedelta(days=back) <= m.kickoff_utc <= now:
                recent.append(m)

    # Сортировки
    live.sort(key=lambda x: x.kickoff_utc)
    upcoming.sort(key=lambda x: x.kickoff_utc)
    recent.sort(key=lambda x: x.kickoff_utc, reverse=True)

    today = dt.date.today()
    date_from = today - dt.timedelta(days=back)
    date_to = today + dt.timedelta(days=ahead)

    return BoardResponse(
        date_from=date_from,
        date_to=date_to,
        leagues=leagues,
        recent=recent,
        live=live,
        upcoming=upcoming,
    )

# ================== /archive ==================


@router.get(
    "/archive/leagues",
    summary="Список лиг для архивов",
)
async def get_archive_leagues(
    client: OpenLigaDBClient = Depends(get_client),
) -> List[dict]:
    """
    Архивный список лиг.

    Пока что это те же самые лиги, что и для основного режима:
    берём шорткаты из DEFAULT_LEAGUES и дергаем OpenLigaDB.
    В будущем сюда можно будет прикрутить БД.
    """
    shortcuts = cfg.get_default_leagues_list()
    if not shortcuts:
        raise HTTPException(status_code=500, detail="DEFAULT_LEAGUES is not configured")

    try:
        leagues = await client.get_leagues(shortcuts)
        return leagues
    except Exception as exc:
        logger.exception("Не удалось получить архивные лиги из OpenLigaDB: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при обращении к внешнему API OpenLigaDB (archive/leagues)",
        )

