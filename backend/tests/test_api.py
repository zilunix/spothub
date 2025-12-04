import datetime as dt

from app import config as cfg
from app.db import get_db
from app.main import app
from app.openligadb_client import Match
from app.sports_api import get_client


class StubOpenLigaClient:
    def __init__(self, *, leagues=None, matches=None, season_raw=None, errors=None):
        self._leagues = leagues or []
        self._matches = matches or []
        self._season_raw = season_raw or []
        self._errors = errors or {}
        self.calls = []

    async def get_leagues(self, shortcuts):
        if exc := self._errors.get("get_leagues"):
            raise exc
        self.calls.append(("get_leagues", shortcuts))
        return self._leagues

    async def get_matches_for_date(self, league, date, season):
        if exc := self._errors.get("get_matches_for_date"):
            raise exc
        self.calls.append(("get_matches_for_date", league, date, season))
        return self._matches

    async def get_season_raw(self, league, season):
        if exc := self._errors.get("get_season_raw"):
            raise exc
        self.calls.append(("get_season_raw", league, season))
        return self._season_raw


def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_returns_message(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"message": "SportHub API. См. /docs"}


def test_get_leagues_returns_configured_shortcuts(client):
    fake_leagues = [
        {"id": "bl1", "name": "Bundesliga", "season": 2024, "sport": "Football"},
        {"id": "apl", "name": "APL", "season": 2024, "sport": "Football"},
    ]
    stub_client = StubOpenLigaClient(leagues=fake_leagues)

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/leagues")

    assert response.status_code == 200
    assert response.json() == fake_leagues
    assert stub_client.calls == [("get_leagues", ["bl1"])]


def test_get_leagues_returns_500_when_no_default_leagues(monkeypatch, client):
    monkeypatch.setattr("app.config.DEFAULT_LEAGUES", "", raising=False)

    response = client.get("/api/leagues")

    assert response.status_code == 500
    assert response.json()["detail"] == "DEFAULT_LEAGUES is not configured"


def test_get_leagues_returns_502_on_client_failure(client):
    stub_client = StubOpenLigaClient(errors={"get_leagues": RuntimeError("boom")})

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/leagues")

    assert response.status_code == 502
    assert "OpenLigaDB" in response.json()["detail"]


def test_matches_with_invalid_date_returns_400(client):
    response = client.get("/api/matches", params={"league": "bl1", "date_str": "2024-99-99"})

    assert response.status_code == 400
    assert "date_str must be in format" in response.json()["detail"]


def test_matches_returns_502_on_client_failure(client):
    stub_client = StubOpenLigaClient(
        errors={"get_matches_for_date": RuntimeError("unreachable")}
    )

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get(
        "/api/matches",
        params={"league": "bl1", "date_str": dt.date(2024, 9, 1).isoformat()},
    )

    assert response.status_code == 502
    assert "OpenLigaDB" in response.json()["detail"]


def test_matches_endpoint_serializes_match_models(client):
    match_date = dt.datetime(2024, 9, 1, 16, 30, tzinfo=dt.timezone.utc)
    stub_client = StubOpenLigaClient(
        matches=[
            Match(
                match_id=1,
                league_name="Bundesliga",
                league_shortcut="bl1",
                season=2024,
                group_name="Round 1",
                date_time=match_date,
                team1="Team A",
                team2="Team B",
                score1=2,
                score2=1,
                is_finished=True,
            )
        ]
    )

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get(
        "/api/matches",
        params={"league": "bl1", "date_str": match_date.date().isoformat()},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["team1"] == "Team A"
    assert payload[0]["team2"] == "Team B"
    assert payload[0]["score1"] == 2
    assert payload[0]["score2"] == 1
    assert stub_client.calls and stub_client.calls[0][0] == "get_matches_for_date"


def test_legacy_leagues_proxies_to_api_handler(client):
    stub_client = StubOpenLigaClient(
        leagues=[{"id": "bl1", "name": "Bundesliga", "season": 2024, "sport": "Football"}]
    )

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/leagues")

    assert response.status_code == 200
    assert response.json() == stub_client._leagues
    assert stub_client.calls == [("get_leagues", ["bl1"])]


def test_legacy_matches_reuses_validation_and_default_season(client):
    kickoff = dt.datetime(2024, 4, 2, 18, 0, tzinfo=dt.timezone.utc)
    stub_client = StubOpenLigaClient(
        matches=[
            Match(
                match_id=10,
                league_name="Bundesliga",
                league_shortcut="bl1",
                season=cfg.DEFAULT_SEASON,
                group_name="Round 10",
                date_time=kickoff,
                team1="Home",
                team2="Away",
                score1=None,
                score2=None,
                is_finished=False,
            )
        ]
    )

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/matches", params={"league": "bl1", "date_str": kickoff.date().isoformat()})

    assert response.status_code == 200
    data = response.json()
    assert data[0]["match_id"] == 10
    assert data[0]["group_name"] == "Round 10"
    assert stub_client.calls == [
        ("get_matches_for_date", "bl1", kickoff.date(), cfg.DEFAULT_SEASON)
    ]


def test_legacy_matches_returns_400_for_invalid_date(client):
    response = client.get("/matches", params={"league": "bl1", "date_str": "2024-13-40"})

    assert response.status_code == 400
    assert "YYYY-MM-DD" in response.json()["detail"]


def test_board_categorizes_live_upcoming_and_recent(client, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    raw_matches = [
        {
            "matchID": 1,
            "leagueShortcut": "bl1",
            "leagueSeason": 2024,
            "matchDateTimeUTC": (now - dt.timedelta(days=1)).isoformat(),
            "matchIsFinished": True,
            "group": {"groupOrderID": 1},
            "team1": {"teamName": "Past A"},
            "team2": {"teamName": "Past B"},
            "matchResults": [{"resultTypeID": 2, "pointsTeam1": 1, "pointsTeam2": 0}],
        },
        {
            "matchID": 2,
            "leagueShortcut": "bl1",
            "leagueSeason": 2024,
            "matchDateTimeUTC": (now - dt.timedelta(minutes=1)).isoformat(),
            "matchIsFinished": False,
            "group": {"groupOrderID": 1},
            "team1": {"teamName": "Live A"},
            "team2": {"teamName": "Live B"},
            "matchResults": [],
        },
        {
            "matchID": 3,
            "leagueShortcut": "bl1",
            "leagueSeason": 2024,
            "matchDateTimeUTC": (now + dt.timedelta(days=1)).isoformat(),
            "matchIsFinished": False,
            "group": {"groupOrderID": 1},
            "team1": {"teamName": "Future A"},
            "team2": {"teamName": "Future B"},
            "matchResults": [],
        },
    ]

    stub_client = StubOpenLigaClient(season_raw=raw_matches)

    async def override_client():
        return stub_client

    async def override_db():
        class DummySession:
            def close(self):
                pass

        yield DummySession()

    # Avoid touching a real database during tests
    monkeypatch.setattr("app.sports_api.bulk_upsert_matches_from_board", lambda **_: None)

    app.dependency_overrides[get_client] = override_client
    app.dependency_overrides[get_db] = override_db

    response = client.get("/api/board")

    assert response.status_code == 200
    board = response.json()

    live_ids = {m["id"] for m in board["live"]}
    upcoming_ids = {m["id"] for m in board["upcoming"]}
    recent_ids = {m["id"] for m in board["recent"]}

    assert live_ids == {2}
    assert upcoming_ids == {3}
    assert recent_ids == {1}
    assert stub_client.calls and stub_client.calls[0][0] == "get_season_raw"


def test_board_returns_empty_lists_when_no_matches(client, monkeypatch, dummy_db):
    stub_client = StubOpenLigaClient(season_raw=[])

    async def override_client():
        return stub_client

    async def override_db():
        yield dummy_db

    def fail_on_upsert(**_):
        raise AssertionError("bulk_upsert_matches_from_board should not be called")

    monkeypatch.setattr(
        "app.sports_api.bulk_upsert_matches_from_board", fail_on_upsert
    )
    app.dependency_overrides[get_client] = override_client
    app.dependency_overrides[get_db] = override_db

    response = client.get("/api/board")

    assert response.status_code == 200
    board = response.json()
    assert board["live"] == []
    assert board["upcoming"] == []
    assert board["recent"] == []
    assert stub_client.calls == [("get_season_raw", "bl1", cfg.DEFAULT_SEASON)]


def test_board_returns_502_on_client_failure(client, dummy_db):
    stub_client = StubOpenLigaClient(errors={"get_season_raw": RuntimeError("boom")})

    async def override_client():
        return stub_client

    async def override_db():
        yield dummy_db

    app.dependency_overrides[get_client] = override_client
    app.dependency_overrides[get_db] = override_db

    response = client.get("/api/board")

    assert response.status_code == 502
    assert "OpenLigaDB" in response.json()["detail"]


def test_archive_leagues_returns_configured_shortcuts(client, monkeypatch):
    monkeypatch.setattr("app.config.DEFAULT_LEAGUES", "bl1,apl", raising=False)

    fake_leagues = [
        {"id": "bl1", "name": "Bundesliga", "season": 2024, "sport": "Football"},
        {"id": "apl", "name": "APL", "season": 2024, "sport": "Football"},
    ]
    stub_client = StubOpenLigaClient(leagues=fake_leagues)

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/archive/leagues")

    assert response.status_code == 200
    assert response.json() == fake_leagues
    assert stub_client.calls == [("get_leagues", ["bl1", "apl"])]


def test_archive_seasons_returns_sorted_unique_values(client):
    stub_client = StubOpenLigaClient(
        leagues=[
            {"season": 2021},
            {"season": "2023"},
            {"season": 2022},
            {"season": "ignored", "name": "non numeric"},
        ]
    )

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/archive/bl1/seasons")

    assert response.status_code == 200
    assert response.json() == [2023, 2022, 2021]
    assert stub_client.calls == [("get_leagues", ["bl1"])]


def test_archive_seasons_returns_404_when_no_leagues_found(client):
    stub_client = StubOpenLigaClient(leagues=[])

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/archive/unknown/seasons")

    assert response.status_code == 404
    assert "не найдена" in response.json()["detail"]


def test_archive_seasons_returns_502_on_client_failure(client):
    stub_client = StubOpenLigaClient(errors={"get_leagues": RuntimeError("down")})

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/archive/bl1/seasons")

    assert response.status_code == 502
    assert "OpenLigaDB" in response.json()["detail"]


def test_archive_matches_returns_sorted_summaries(client):
    now = dt.datetime.now(dt.timezone.utc)
    stub_client = StubOpenLigaClient(
        season_raw=[
            {
                "matchID": 2,
                "leagueShortcut": "bl1",
                "leagueSeason": 2022,
                "matchDateTimeUTC": (now + dt.timedelta(days=2)).isoformat(),
                "matchIsFinished": False,
                "group": {"groupOrderID": 2},
                "team1": {"teamName": "Later"},
                "team2": {"teamName": "Later B"},
                "matchResults": [],
            },
            {
                "matchID": 1,
                "leagueShortcut": "bl1",
                "leagueSeason": 2022,
                "matchDateTimeUTC": (now + dt.timedelta(days=1)).isoformat(),
                "matchIsFinished": False,
                "group": {"groupOrderID": 1},
                "team1": {"teamName": "Soon"},
                "team2": {"teamName": "Soon B"},
                "matchResults": [],
            },
        ]
    )

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/archive/bl1/2022/matches")

    assert response.status_code == 200
    matches = response.json()
    assert [m["id"] for m in matches] == [1, 2]
    assert stub_client.calls == [("get_season_raw", "bl1", 2022)]


def test_archive_matches_returns_404_when_empty(client):
    stub_client = StubOpenLigaClient(season_raw=[])

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/archive/bl1/2022/matches")

    assert response.status_code == 404
    assert "матчи не найдены" in response.json()["detail"]


def test_archive_matches_returns_502_on_client_failure(client):
    stub_client = StubOpenLigaClient(errors={"get_season_raw": RuntimeError("boom")})

    async def override_client():
        return stub_client

    app.dependency_overrides[get_client] = override_client

    response = client.get("/api/archive/bl1/2022/matches")

    assert response.status_code == 502
    assert "OpenLigaDB" in response.json()["detail"]
