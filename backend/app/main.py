# app/main.py
from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .openligadb_client import OpenLigaDBClient
from .sports_api import (
    router as sports_router,
    get_client,
    get_leagues as get_leagues_handler,
    get_matches as get_matches_handler,
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


# ==== Legacy-роуты для текущего фронтенда (/leagues, /matches) ====

@app.get("/leagues", tags=["sports-legacy"])
async def legacy_leagues(
    client: OpenLigaDBClient = Depends(get_client),
):
    """
    Старый маршрут, который использует тот же обработчик, что и /api/leagues.
    Нужен для уже задеплоенного фронтенда, который ходит на /leagues.
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
