# app/repositories/matches.py
from __future__ import annotations

from datetime import datetime
from typing import Iterable, Mapping, Any

from sqlalchemy.orm import Session

from app.models import League, Season, Match


def get_or_create_league(
    db: Session,
    shortcut: str,
    name: str,
    country: str = "Germany",
    sport: str = "Football",
) -> League:
    league = db.query(League).filter_by(shortcut=shortcut).first()
    if league:
        return league

    league = League(
        shortcut=shortcut,
        name=name,
        country=country,
        sport=sport,
    )
    db.add(league)
    db.flush()
    return league


def get_or_create_season(
    db: Session,
    league: League,
    year: int,
    is_current: bool = True,
) -> Season:
    season = (
        db.query(Season)
        .filter(
            Season.league_id == league.id,
            Season.year == year,
        )
        .first()
    )
    if season:
        return season

    season = Season(
        league_id=league.id,
        year=year,
        is_current=is_current,
    )
    db.add(season)
    db.flush()
    return season


def _extract_external_id(match_data: Mapping[str, Any]) -> int:
    """
    Пытаемся вытащить идентификатор матча из разных возможных ключей.
    """
    for key in ("id", "external_match_id", "match_id", "matchID"):
        if key in match_data and match_data[key] is not None:
            return int(match_data[key])
    raise ValueError(f"Cannot determine external match id from data: {match_data!r}")


def _extract_group_order_id(match_data: Mapping[str, Any]) -> int:
    for key in ("group_order_id", "groupOrderID", "group_order"):
        if key in match_data and match_data[key] is not None:
            return int(match_data[key])
    # если вообще нет — считаем 0
    return 0


def _extract_kickoff_utc(match_data: Mapping[str, Any]) -> datetime:
    """
    Ожидаем либо ISO-строку, либо datetime.
    """
    val = match_data.get("kickoff_utc") or match_data.get("kickoff")
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        # убираем 'Z' и приводим к offset-aware datetime
        return datetime.fromisoformat(val.replace("Z", "+00:00"))

    raise ValueError(f"Cannot determine kickoff_utc from data: {match_data!r}")


def _extract_team_name(match_data: Mapping[str, Any], key: str) -> str:
    """
    Поддержка как плоских полей, так и вложенных структур (team1.name).
    """
    if key in match_data and match_data[key]:
        return str(match_data[key])

    nested = match_data.get(key.replace("_name", ""))
    if isinstance(nested, Mapping):
        for k in ("teamName", "name", "shortName"):
            if k in nested and nested[k]:
                return str(nested[k])

    return "Unknown"


def upsert_match_from_payload(
    db: Session,
    league: League,
    season: Season,
    match_data: Mapping[str, Any],
) -> Match:
    """
    Универсальный upsert матча в БД.

    match_data может быть:
    - dict, полученный из MatchSummary.model_dump(mode="json")
    - или любой другой dict с ожидаемыми полями.
    """
    external_id = _extract_external_id(match_data)

    match = (
        db.query(Match)
        .filter(
            Match.external_match_id == external_id,
            Match.season_id == season.id,
        )
        .first()
    )

    kickoff_dt = _extract_kickoff_utc(match_data)
    group_order_id = _extract_group_order_id(match_data)

    status = str(match_data.get("status", "UNKNOWN"))
    team1_name = _extract_team_name(match_data, "team1_name")
    team2_name = _extract_team_name(match_data, "team2_name")

    score_team1 = match_data.get("score_team1")
    score_team2 = match_data.get("score_team2")

    if not match:
        match = Match(
            external_match_id=external_id,
            league_id=league.id,
            season_id=season.id,
            group_order_id=group_order_id,
            kickoff_utc=kickoff_dt,
            status=status,
            team1_name=team1_name,
            team2_name=team2_name,
            score_team1=score_team1,
            score_team2=score_team2,
            # raw_payload должен быть JSON-сериализуемым — сюда будем передавать dict
            raw_payload=dict(match_data),
        )
        db.add(match)
    else:
        match.group_order_id = group_order_id
        match.kickoff_utc = kickoff_dt
        match.status = status
        match.team1_name = team1_name
        match.team2_name = team2_name
        match.score_team1 = score_team1
        match.score_team2 = score_team2
        match.raw_payload = dict(match_data)

    return match


def bulk_upsert_matches_from_board(
    db: Session,
    league_shortcut: str,
    league_name: str,
    season_year: int,
    matches: Iterable[Mapping[str, Any]],
) -> None:
    """
    Универсальная точка входа: на вход список матчей (dict, совместимый
    с MatchSummary.model_dump(mode='json')), на выходе — данные в БД.
    """
    league = get_or_create_league(
        db=db,
        shortcut=league_shortcut,
        name=league_name,
    )
    season = get_or_create_season(
        db=db,
        league=league,
        year=season_year,
        is_current=True,
    )

    for m in matches:
        upsert_match_from_payload(db, league, season, m)

    db.commit()
