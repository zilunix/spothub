from __future__ import annotations

from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


class MatchStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    FINISHED = "FINISHED"


class MatchSummary(BaseModel):
    id: int
    league_shortcut: str
    league_season: int
    group_order_id: int

    team1_name: str
    team2_name: str

    kickoff_utc: datetime
    status: MatchStatus

    score_team1: Optional[int] = None
    score_team2: Optional[int] = None


def _parse_kickoff(raw_match: dict[str, Any]) -> datetime:
    """
    Привести дату матча к UTC.
    OpenLigaDB обычно отдаёт matchDateTimeUTC в ISO-формате.
    """
    dt_str = raw_match.get("matchDateTimeUTC") or raw_match.get("matchDateTime")
    if not dt_str:
        # на всякий случай — "сейчас", чтобы не падать
        return datetime.now(timezone.utc)

    # Пример формата: "2024-08-18T15:30:00" или "...Z"
    dt_str = dt_str.replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(dt_str)
    except Exception:
        # если совсем странный формат — тоже не валимся
        return datetime.now(timezone.utc)

    # Если дата наивная — считаем, что это уже UTC
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _extract_final_score(match_results: list[dict[str, Any]] | None) -> tuple[Optional[int], Optional[int]]:
    """
    Вытаскиваем финальный счёт из массива matchResults.
    Берём resultTypeID == 2 (Endergebnis), иначе последний элемент.
    """
    if not match_results:
        return None, None

    final = None
    for r in match_results:
        if r.get("resultTypeID") == 2:
            final = r
            break

    if final is None:
        final = match_results[-1]

    return final.get("pointsTeam1"), final.get("pointsTeam2")


def classify_match(raw_match: dict[str, Any], now: datetime | None = None) -> MatchSummary:
    """
    Преобразовать сырой матч OpenLigaDB в MatchSummary и проставить статус.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    else:
        # на всякий случай приводим к UTC
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        else:
            now = now.astimezone(timezone.utc)

    kickoff = _parse_kickoff(raw_match)
    score1, score2 = _extract_final_score(raw_match.get("matchResults") or [])

    # Статус
    if raw_match.get("matchIsFinished"):
        status = MatchStatus.FINISHED
    else:
        # если старт ещё далеко в будущем — матч запланирован
        if kickoff > now + timedelta(minutes=5):
            status = MatchStatus.SCHEDULED
        else:
            # время уже наступило, а matchIsFinished = False → считаем LIVE
            status = MatchStatus.LIVE

    group = raw_match.get("group") or {}

    return MatchSummary(
        id=raw_match.get("matchID"),
        league_shortcut=raw_match.get("leagueShortcut"),
        league_season=int(raw_match.get("leagueSeason")),
        group_order_id=int(group.get("groupOrderID") or 0),
        team1_name=(raw_match.get("team1") or {}).get("teamName"),
        team2_name=(raw_match.get("team2") or {}).get("teamName"),
        kickoff_utc=kickoff,
        status=status,
        score_team1=score1,
        score_team2=score2,
    )
class MatchStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    FINISHED = "FINISHED"
    UNKNOWN = "UNKNOWN"   # <- добавить


class ArchiveMatchesResponse(BaseModel):
    page: int
    page_size: int
    total: int
    items: list[MatchSummary]

class ArchiveLeagueInfo(BaseModel):
    shortcut: str
    name: str
    country: str
    sport: str
    seasons: list[int]


class ArchiveMetaResponse(BaseModel):
    items: list[ArchiveLeagueInfo]
