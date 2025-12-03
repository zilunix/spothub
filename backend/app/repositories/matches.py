# app/repositories/matches.py
from datetime import datetime
from typing import Iterable

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


def upsert_match_from_payload(
    db: Session,
    league: League,
    season: Season,
    match_data: dict,
) -> Match:
    """
    Ожидаем match_data в формате, который у тебя уже есть в board, например:
    {
        "id": 72222,
        "league_shortcut": "bl1",
        "league_season": 2024,
        "group_order_id": 1,
        "team1_name": "...",
        "team2_name": "...",
        "kickoff_utc": "2024-08-25T15:30:00Z",
        "status": "FINISHED",
        "score_team1": 0,
        "score_team2": 2,
        ...
    }
    """
    external_id = match_data["id"]

    match = (
        db.query(Match)
        .filter(
            Match.external_match_id == external_id,
            Match.season_id == season.id,
        )
        .first()
    )

    kickoff_str = match_data["kickoff_utc"]
    kickoff_dt = datetime.fromisoformat(kickoff_str.replace("Z", "+00:00"))

    if not match:
        match = Match(
            external_match_id=external_id,
            league_id=league.id,
            season_id=season.id,
            group_order_id=match_data["group_order_id"],
            kickoff_utc=kickoff_dt,
            status=match_data["status"],
            team1_name=match_data["team1_name"],
            team2_name=match_data["team2_name"],
            score_team1=match_data.get("score_team1"),
            score_team2=match_data.get("score_team2"),
            raw_payload=match_data,
        )
        db.add(match)
    else:
        match.group_order_id = match_data["group_order_id"]
        match.kickoff_utc = kickoff_dt
        match.status = match_data["status"]
        match.team1_name = match_data["team1_name"]
        match.team2_name = match_data["team2_name"]
        match.score_team1 = match_data.get("score_team1")
        match.score_team2 = match_data.get("score_team2")
        match.raw_payload = match_data

    return match


def bulk_upsert_matches_from_board(
    db: Session,
    league_shortcut: str,
    league_name: str,
    season_year: int,
    matches: Iterable[dict],
) -> None:
    """
    Универсальная точка входа: на вход список матчей из board —
    на выходе всё в БД.
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
