# app/sports_api.py
from __future__ import annotations

import datetime as dt
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query

from . import config as cfg
from .openligadb_client import Match, OpenLigaDBClient

router = APIRouter(prefix="/api", tags=["sports"])


async def get_client() -> OpenLigaDBClient:
    """Dependency для DI клиента OpenLigaDB."""
    return OpenLigaDBClient()


@router.get("/leagues")
async def get_leagues(
    client: OpenLigaDBClient = Depends(get_client),
) -> Dict[str, Any]:
    """
    Список лиг, которые мы хотим показывать на фронте.

    Шорткаты берём из config.DEFAULT_LEAGUES (например, 'bl1,bl2').
    """
    shortcuts = cfg.get_default_leagues_list()
    if not shortcuts:
        raise HTTPException(status_code=500, detail="DEFAULT_LEAGUES is not configured")

    leagues = await client.get_leagues(shortcuts)
    return {"items": leagues}


@router.get("/matches")
async def get_matches(
    league: str,
    date_str: str = Query(..., description="Дата в формате YYYY-MM-DD"),
    client: OpenLigaDBClient = Depends(get_client),
) -> Dict[str, Any]:
    """
    Матчи выбранной лиги на указанную дату.

    Возвращаем структуру {'items': [...]} — как ждёт фронтенд.
    """
    # валидируем дату
    try:
        date = dt.date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="date_str must be in format YYYY-MM-DD")

    matches = await client.get_matches_for_date(
        league=league,
        date=date,
        season=cfg.DEFAULT_SEASON,
    )

    # фронту удобнее dict, чем Pydantic-модели
    return {"items": [m.model_dump() for m in matches]}
