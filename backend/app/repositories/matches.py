# app/repositories/matches.py
from __future__ import annotations

from datetime import datetime
from typing import Iterable, Mapping, Any, Optional

from sqlalchemy.orm import Session

from app.models import League, Season, Match


def get_or_create_league(
    db: Session,
    shortcut: str,
    name: str,
    country: str = "Germany",
    sport: str = "Football",
) -> League:
    """
    Находит лигу по shortcut или создаёт новую.
    """
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
    """
    Находит сезон по (league, year) или создаёт новый.
    """
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

    Поддерживаем:
    - id
    - external_match_id
    - match_id
    - matchID
    """
    for key in ("id", "external_match_id", "match_id", "matchID"):
        if key in match_data and match_data[key] not in (None, ""):
            return int(match_data[key])
    raise ValueError(f"Cannot determine external match id from data: {match_data!r}")


def _extract_group_order_id(match_data: Mapping[str, Any]) -> int:
    """
    Порядок группы/тура. Если нет — считаем 0.
    """
    for key in ("group_order_id", "groupOrderID", "group_order"):
        if key in match_data and match_data[key] not in (None, ""):
            return int(match_data[key])
    return 0


def _parse_datetime_maybe(value: Any) -> Optional[datetime]:
    """
    Универсальный парсер datetime:

    - если уже datetime — возвращаем как есть;
    - если строка:
      - убираем 'Z' в конце и подставляем +00:00;
      - пробуем datetime.fromisoformat в нескольких вариантах;
    - иначе None.
    """
    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None

        # Z-суффикс → UTC
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"

        # Пробуем напрямую
        try:
            return datetime.fromisoformat(s)
        except ValueError:
            pass

        # Пробуем заменить пробел на 'T'
        try:
            return datetime.fromisoformat(s.replace(" ", "T"))
        except ValueError:
            return None

    return None


def _extract_kickoff_utc(match_data: Mapping[str, Any]) -> Optional[datetime]:
    """
    Достаём дату/время начала матча в UTC (или с таймзоной).

    Поддерживаем как наши поля, так и сырые из OpenLigaDB:
    - kickoff_utc / kickoff
    - matchDateTimeUTC / matchDateTime / MatchDateTimeUTC / MatchDateTime
    """
    keys_to_try = (
        "kickoff_utc",
        "kickoff",
        "matchDateTimeUTC",
        "matchDateTime",
        "MatchDateTimeUTC",
        "MatchDateTime",
    )

    for key in keys_to_try:
        if key in match_data and match_data[key] not in (None, ""):
            dt = _parse_datetime_maybe(match_data[key])
            if dt is not None:
                return dt

    # Если не удалось — возвращаем None, вызывающая функция решит, что делать
    return None


def _extract_team_name(match_data: Mapping[str, Any], key: str) -> str:
    """
    Поддержка как плоских полей, так и вложенных структур (например, team1.name).

    Ожидаем:
    - team1_name / team2_name
    - или вложенные объекты team1/team2 с полями teamName/name/shortName.
    """
    # Плоское поле
    if key in match_data and match_data[key]:
        return str(match_data[key])

    # Вложенный объект: team1_name -> team1, team2_name -> team2
    nested_key = key.replace("_name", "")
    nested = match_data.get(nested_key)
    if isinstance(nested, Mapping):
        for candidate in ("teamName", "name", "shortName"):
            if candidate in nested and nested[candidate]:
                return str(nested[candidate])

    return "Unknown"


def upsert_match_from_payload(
    db: Session,
    league: League,
    season: Season,
    match_data: Mapping[str, Any],
) -> Optional[Match]:
    """
    Универсальный upsert матча в БД.

    match_data может быть:
    - dict, полученный из MatchSummary.model_dump(mode="json");
    - или любой другой dict с ожидаемыми полями.
    """
    external_id = _extract_external_id(match_data)

    match: Optional[Match] = (
        db.query(Match)
        .filter(
            Match.external_match_id == external_id,
            Match.season_id == season.id,
        )
        .first()
    )

    kickoff_dt = _extract_kickoff_utc(match_data)
    # Если не смогли распарсить дату — просто пропускаем матч,
    # чтобы не уронить весь sync-season на одном кривом payload.
    if kickoff_dt is None:
        return None

    group_order_id = _extract_group_order_id(match_data)

    status = str(match_data.get("status", "UNKNOWN"))
    team1_name = _extract_team_name(match_data, "team1_name")
    team2_name = _extract_team_name(match_data, "team2_name")

    score_team1 = match_data.get("score_team1")
    score_team2 = match_data.get("score_team2")

    if match is None:
        # Новый матч
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
            # raw_payload должен быть JSON-сериализуемым — сюда кладём dict
            raw_payload=dict(match_data),
        )
        db.add(match)
    else:
        # Обновление существующего матча
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
