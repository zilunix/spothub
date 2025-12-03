# app/sports_api.py
from __future__ import annotations

import datetime as dt
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import config as cfg
from .db import get_db
from .openligadb_client import Match, OpenLigaDBClient
from .repositories.matches import bulk_upsert_matches_from_board
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
    db: Session = Depends(get_db),
    client: OpenLigaDBClient = Depends(get_client),
) -> BoardResponse:
    """
    Эндпоинт /board: live / upcoming / recent матчи.

    Берём сезоны для лиг по умолчанию (DEFAULT_LEAGUES, DEFAULT_SEASON),
    загружаем все матчи сезона, классифицируем и ПАРАЛЛЕЛЬНО сохраняем
    их в базу данных.
    """
    now = dt.datetime.now(dt.timezone.utc)

    leagues = cfg.get_default_leagues_list()
    season = cfg.DEFAULT_SEASON

    ahead = days_ahead
    back = days_back

    live: List[MatchSummary] = []
    upcoming: List[MatchSummary] = []
    recent: List[MatchSummary] = []

    try:
        # Для каждой лиги тянем матчи сезона, классифицируем
        # и сохраняем в БД
        for lg in leagues:
            raw_matches = await client.get_season_raw(lg, season)

            league_summaries: List[MatchSummary] = []
            for rm in raw_matches:
                ms = classify_match(rm, now)
                league_summaries.append(ms)

            # Сохраняем/обновляем эти матчи в БД.
            # На этом шаге ошибки БД логируем, но не ломаем сам /board,
            # чтобы фронт не страдал, если Postgres временно недоступен.
            try:
                if league_summaries:
                    bulk_upsert_matches_from_board(
                        db=db,
                        league_shortcut=lg,
                        league_name=lg,  # пока используем shortcut как name
                        season_year=season,
                        matches=[m.model_dump() for m in league_summaries],
                    )
            except Exception as db_exc:
                logger.exception(
                    "Ошибка при сохранении матчей лиги %s сезона %s в БД: %s",
                    lg,
                    season,
                    db_exc,
                )

            # Классифицируем по live / upcoming / recent в рамках окна
            for m in league_summaries:
                if m.status == MatchStatus.LIVE:
                    live.append(m)
                elif m.status == MatchStatus.SCHEDULED:
                    if now <= m.kickoff_utc <= now + dt.timedelta(days=ahead):
                        upcoming.append(m)
                elif m.status == MatchStatus.FINISHED:
                    if now - dt.timedelta(days=back) <= m.kickoff_utc <= now:
                        recent.append(m)

    except Exception as exc:
        logger.exception("Не удалось получить матчи для /board из OpenLigaDB: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Ошибка при обращении к внешнему API OpenLigaDB (board)",
        )

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


@router.get(
    "/archive/{league}/seasons",
    summary="Доступные сезоны для выбранной лиги (архив)",
)
async def get_archive_seasons(
    league: str,
    client: OpenLigaDBClient = Depends(get_client),
) -> List[int]:
    """
    Вернуть список сезонов для архивной лиги.

    Берём все записи по данной лиге из OpenLigaDB и возвращаем уникальные сезоны,
    отсортированные по убыванию (последние сезоны первыми).
    """
    # приводим shortcut к нижнему регистру для унификации
    league = league.lower()

    try:
        # используем уже существующий клиент — он вернёт все записи по этой лиге
        leagues = await client.get_leagues([league])
    except Exception as exc:
        logger.exception(
            "Не удалось получить сезоны для архивной лиги %s: %s",
            league,
            exc,
        )
        raise HTTPException(
            status_code=502,
            detail="Ошибка при обращении к внешнему API OpenLigaDB (archive/seasons)",
        )

    if not leagues:
        raise HTTPException(
            status_code=404,
            detail=f"Лига '{league}' не найдена или не имеет сезонов",
        )

    seasons_set = set()
    for item in leagues:
        s = item.get("season")
        if s is None:
            continue
        try:
            seasons_set.add(int(s))
        except (TypeError, ValueError):
            # если по каким-то причинам не число — пропускаем
            continue

    if not seasons_set:
        raise HTTPException(
            status_code=404,
            detail=f"Для лиги '{league}' не найдено ни одного сезона",
        )

    # сортируем по убыванию (новые сезоны первыми)
    seasons_sorted = sorted(seasons_set, reverse=True)
    return seasons_sorted


@router.get(
    "/archive/{league}/{season}/matches",
    response_model=List[MatchSummary],
    summary="Матчи выбранной лиги и сезона (архив)",
)
async def get_archive_matches(
    league: str,
    season: int,
    client: OpenLigaDBClient = Depends(get_client),
) -> List[MatchSummary]:
    """
    Архивные матчи для конкретной лиги и сезона.

    Берём сырые матчи сезона из OpenLigaDB и приводим к MatchSummary.
    """
    league = league.lower()

    try:
        raw_matches = await client.get_season_raw(league, season)
    except Exception as exc:
        logger.exception(
            "Не удалось получить архивные матчи (league=%s, season=%s): %s",
            league,
            season,
            exc,
        )
        raise HTTPException(
            status_code=502,
            detail="Ошибка при обращении к внешнему API OpenLigaDB (archive/matches)",
        )

    if not raw_matches:
        raise HTTPException(
            status_code=404,
            detail=f"Для лиги '{league}' и сезона {season} матчи не найдены",
        )

    now = dt.datetime.now(dt.timezone.utc)

    summaries: List[MatchSummary] = []
    for rm in raw_matches:
        ms = classify_match(rm, now)
        summaries.append(ms)

    # сортируем по времени начала
    summaries.sort(key=lambda x: x.kickoff_utc)

    return summaries
