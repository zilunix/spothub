from datetime import date
from typing import List

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings
from .sports_api import list_leagues, list_matches, list_teams


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

# CORS для локальной разработки фронта
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Проверка живости")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/leagues", response_model=List[League], summary="Список лиг")
async def get_leagues() -> List[League]:
    leagues = await list_leagues()
    return [League(**l) for l in leagues]


@app.get("/teams", response_model=List[Team], summary="Список команд лиги")
async def get_teams(league: str = Query(..., description="ID лиги")) -> List[Team]:
    teams = await list_teams(league)
    return [Team(**t) for t in teams]


@app.get("/matches", response_model=List[Match], summary="Матчи лиги на дату")
async def get_matches(
    league: str = Query(..., description="ID лиги, например nhl или apl"),
    date_str: str = Query(
        default=date.today().isoformat(), description="Дата в формате YYYY-MM-DD"
    ),
) -> List[Match]:
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Некорректная дата, нужен формат YYYY-MM-DD")

    matches = await list_matches(league, d)
    return [Match(**m) for m in matches]


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"message": "SportHub API. См. /docs"}
