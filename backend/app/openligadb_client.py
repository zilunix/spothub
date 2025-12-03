# app/openligadb_client.py
from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional

import httpx
from pydantic import BaseModel

from . import config as cfg


class Match(BaseModel):
    match_id: int
    league_name: Optional[str]
    league_shortcut: str
    season: int
    group_name: Optional[str]
    date_time: dt.datetime
    team1: str
    team2: str
    score1: Optional[int]
    score2: Optional[int]
    is_finished: bool


class OpenLigaDBClient:
    """Клиент для публичного JSON-API OpenLigaDB."""

    def __init__(self, base_url: Optional[str] = None) -> None:
        # По умолчанию берём URL из config.SPORTS_API_BASE_URL
        self.base_url = (base_url or cfg.SPORTS_API_BASE_URL).rstrip("/")

    async def _get(self, path: str) -> Any:
        """Внутренний метод для GET-запросов."""
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()

    async def get_leagues(self, shortcuts: List[str]) -> List[Dict[str, Any]]:
        """
        Вернуть список лиг по их leagueShortcut.

        Использует эндпоинт /getavailableleagues и фильтрует по нужным шорткатам.
        """
        raw = await self._get("/getavailableleagues")
        shortcuts_lower = [s.lower() for s in shortcuts]
        result: List[Dict[str, Any]] = []

        for item in raw:
            shortcut = str(item.get("leagueShortcut") or "").lower()
            if shortcut not in shortcuts_lower:
                continue

            result.append(
                {
                    "id": shortcut,
                    "name": item.get("leagueName") or shortcut,
                    "season": item.get("leagueSeason"),
                    "sport": item.get("sportName") or item.get("leagueSport") or "Football",
                }
            )

        # сохраняем порядок, как в shortcuts
        result.sort(key=lambda x: shortcuts_lower.index(x["id"]))
        return result

    async def get_matches_for_date(
        self,
        league: str,
        date: dt.date,
        season: Optional[int] = None,
    ) -> List[Match]:
        """
        Вернуть матчи указанной лиги на конкретную дату.

        Упрощённо: берём все матчи сезона и фильтруем по дате matchDateTime.
        """
        league = league.lower()

        # простая эвристика для европейских сезонов
        if season is None:
            season = date.year if date.month >= 7 else date.year - 1

        # /getmatchdata/{LeagueShortcut}/{LeagueSeason}
        raw = await self._get(f"/getmatchdata/{league}/{season}")

        matches: List[Match] = []

        for m in raw:
            dt_str = m.get("matchDateTime") or m.get("matchDateTimeUTC")
            if not dt_str:
                continue

            try:
                match_dt = dt.datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            except Exception:
                continue

            if match_dt.date() != date:
                continue

            # финальный счёт — resultTypeID == 2 (Endergebnis), если есть
            match_results = m.get("matchResults") or []
            score1 = score2 = None
            if match_results:
                final = None
                for r in match_results:
                    if r.get("resultTypeID") == 2:
                        final = r
                        break
                if final is None:
                    final = match_results[-1]
                score1 = final.get("pointsTeam1")
                score2 = final.get("pointsTeam2")

            group = m.get("group") or {}

            matches.append(
                Match(
                    match_id=m.get("matchID"),
                    league_name=m.get("leagueName"),
                    league_shortcut=m.get("leagueShortcut") or league,
                    season=m.get("leagueSeason") or season,
                    group_name=group.get("groupName"),
                    date_time=match_dt,
                    team1=(m.get("team1") or {}).get("teamName"),
                    team2=(m.get("team2") or {}).get("teamName"),
                    score1=score1,
                    score2=score2,
                    is_finished=bool(m.get("matchIsFinished")),
                )
            )

        matches.sort(key=lambda x: x.date_time)
        return matches
