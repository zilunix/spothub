# app/sports_api.py
from __future__ import annotations

import datetime as dt
import logging
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query

from . import config as cfg
from .openligadb_client import Match, OpenLigaDBClient

router = APIRouter(prefix="/api", tags=["sports"])

logger = logging.getLogger(__name__)


async def get_client() -> OpenLigaDBClient:
    """Dependency для DI клиента OpenLigaDB."""
    return OpenLigaDBClient()


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
