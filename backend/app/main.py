# backend/app/main.py
from __future__ import annotations

import datetime as dt

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.settings import settings
from app.db import get_db
from app.clients.openligadb_client import OpenLigaDBClient
from app.sports_api import (
    router as sports_router,
    get_client,
    # handlers (sports)
    get_leagues as get_leagues_handler,
    get_matches as get_matches_handler,
    get_board as get_board_handler,
    # handlers (archive)
    get_archive_leagues as get_archive_leagues_handler,
    get_archive_seasons as get_archive_seasons_handler,
    get_archive_matches as get_archive_matches_handler,
    get_archive as get_archive_handler,
    get_archive_meta_endpoint as get_archive_meta_handler,
)

app = FastAPI(
    title="SportHub API",
    version="0.1.0",
    description="Простой API для отображения спортивных лиг и матчей (через OpenLigaDB).",
)

# CORS — чтобы фронт из браузера мог ходить к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # при желании потом сузим до dev.sporthub.local
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Проверка живости")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"message": "SportHub API. См. /docs"}


# Основные маршруты с префиксом /api (см. sports_api.py)
app.include_router(sports_router)

# ==== Legacy-роуты для текущего фронтенда (/leagues, /matches, /board) ====
# Нужны из-за ingress rewrite: внешний /api/* превращается во внутренний /*.
# Поэтому backend должен поддерживать “внутренние” пути без /api.


@app.get("/leagues", tags=["sports-legacy"])
async def legacy_leagues(
    client: OpenLigaDBClient = Depends(get_client),
):
    """
    Старый маршрут, который использует тот же обработчик, что и /api/leagues.
    Нужен для фронтенда/ingress, когда внешний /api/leagues превращается во /leagues.
    """
    return await get_leagues_handler(client=client)


@app.get("/matches", tags=["sports-legacy"])
async def legacy_matches(
    league: str,
    date_str: str,
    client: OpenLigaDBClient = Depends(get_client),
):
    """
    Старый маршрут, проксирующий на /api/matches.
    """
    return await get_matches_handler(
        league=league,
        date_str=date_str,
        client=client,
    )


@app.get("/board", tags=["sports-legacy"])
async def legacy_board(
    # Эти параметры нужны, потому что ingress rewrite превращает внешний /api/board
    # во внутренний /board. Поэтому legacy /board должен поддерживать те же query.
    leagues: str | None = None,  # "bl1,bl2"
    season: int | None = None,   # 2024/2025
    days_back: int = 7,
    days_ahead: int = 7,
    client: OpenLigaDBClient = Depends(get_client),
):
    """
    Legacy маршрут для /board.
    Нужен из-за ingress rewrite: внешний /api/board превращается во внутренний /board.
    """
    return await get_board_handler(
        leagues=leagues,
        season=season,
        days_back=days_back,
        days_ahead=days_ahead,
        client=client,
    )


# ==== Legacy-роуты для архива (/archive/*) ====
# Аналогично /board: внешний /api/archive/* превращается во внутренний /archive/*.
# Поэтому добавляем “внутренние” пути без /api и проксируем в те же handlers.


@app.get("/archive/meta", tags=["archive-legacy"])
def legacy_archive_meta(
    db: Session = Depends(get_db),
):
    return get_archive_meta_handler(db=db)


@app.get("/archive", tags=["archive-legacy"])
def legacy_archive(
    league: str = Query(..., description="Shortcut лиги, например bl1"),
    season: int | None = Query(default=None, description="Год сезона, например 2024"),
    date_from: dt.date | None = Query(default=None, description="YYYY-MM-DD"),
    date_to: dt.date | None = Query(default=None, description="YYYY-MM-DD (включительно)"),
    status: str | None = Query(default=None, description="FINISHED/LIVE/SCHEDULED/UNKNOWN"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return get_archive_handler(
        league=league,
        season=season,
        date_from=date_from,
        date_to=date_to,
        status=status,
        page=page,
        page_size=page_size,
        db=db,
    )


@app.get("/archive/leagues", tags=["archive-legacy"])
async def legacy_archive_leagues(
    client: OpenLigaDBClient = Depends(get_client),
):
    return await get_archive_leagues_handler(client=client)


@app.get("/archive/{league}/seasons", tags=["archive-legacy"])
async def legacy_archive_seasons(
    league: str,
    client: OpenLigaDBClient = Depends(get_client),
):
    return await get_archive_seasons_handler(league=league, client=client)


@app.get("/archive/{league}/{season}/matches", tags=["archive-legacy"])
async def legacy_archive_matches(
    league: str,
    season: int,
    client: OpenLigaDBClient = Depends(get_client),
):
    return await get_archive_matches_handler(league=league, season=season, client=client)


@app.get("/debug/openligadb/ping", tags=["debug"])
async def debug_openligadb_ping():
    """
    Проверка доступности OpenLigaDB из backend.
    """
    client = OpenLigaDBClient()
    league = settings.default_leagues[0] if settings.default_leagues else "bl1"
    groups = await client.get_available_groups(league, settings.default_season)
    return {
        "ok": True,
        "league": league,
        "season": settings.default_season,
        "groups_count": len(groups),
    }
