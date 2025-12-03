// src/pages/ArchivePage.jsx
import React, { useEffect, useState } from "react";
import {
  fetchArchiveLeagues,
  fetchArchiveSeasons,
  fetchArchiveGroups,
  fetchArchiveMatches,
} from "../api";
import { MatchesTable } from "../components/MatchesTable";

function normalizeLeagueOption(item) {
  if (typeof item === "string") {
    return { value: item, label: item };
  }
  const value =
    item.league_shortcut ||
    item.shortcut ||
    item.code ||
    item.id ||
    item.leagueId ||
    "";
  const label =
    item.name ||
    item.league_name ||
    item.leagueShortcut ||
    item.league_shortcut ||
    item.shortcut ||
    value ||
    "Лига";
  return { value: String(value), label: String(label) };
}

function normalizeSeasonOption(item) {
  if (typeof item === "number" || typeof item === "string") {
    const v = String(item);
    return { value: v, label: v };
  }
  const value =
    item.season ||
    item.league_season ||
    item.year ||
    item.id ||
    "";
  return { value: String(value), label: String(value) };
}

function normalizeGroupOption(item) {
  if (typeof item === "number" || typeof item === "string") {
    const v = String(item);
    return { value: v, label: `Тур ${v}` };
  }
  const value =
    item.group_order_id ||
    item.groupOrderId ||
    item.order ||
    item.id ||
    "";
  const label =
    item.name ||
    item.group_name ||
    item.groupName ||
    `Тур ${value}`;
  return { value: String(value), label: String(label) };
}

export function ArchivePage() {
  const [leagues, setLeagues] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [groups, setGroups] = useState([]);

  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Загрузка лиг при монтировании
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const data = await fetchArchiveLeagues();
        const options = (Array.isArray(data) ? data : []).map(
          normalizeLeagueOption,
        );
        setLeagues(options);

        if (options.length > 0) {
          setSelectedLeague(options[0].value);
        }
      } catch (e) {
        console.error("Failed to load archive leagues:", e);
        setError(e.message || "Ошибка загрузки лиг архива.");
        setLeagues([]);
      }
    })();
  }, []);

  // 2. Загрузка сезонов при выборе лиги
  useEffect(() => {
    if (!selectedLeague) {
      setSeasons([]);
      setSelectedSeason("");
      return;
    }

    (async () => {
      try {
        setError(null);
        const data = await fetchArchiveSeasons(selectedLeague);
        const options = (Array.isArray(data) ? data : []).map(
          normalizeSeasonOption,
        );
        setSeasons(options);
        setSelectedSeason(options.length > 0 ? options[0].value : "");
      } catch (e) {
        console.error("Failed to load archive seasons:", e);
        setError(e.message || "Ошибка загрузки сезонов архива.");
        setSeasons([]);
        setSelectedSeason("");
      }
    })();
  }, [selectedLeague]);

  // 3. Загрузка туров при выборе сезона
  useEffect(() => {
    if (!selectedLeague || !selectedSeason) {
      setGroups([]);
      setSelectedGroup("");
      return;
    }

    (async () => {
      try {
        setError(null);
        const data = await fetchArchiveGroups(selectedLeague, selectedSeason);
        const options = (Array.isArray(data) ? data : []).map(
          normalizeGroupOption,
        );
        setGroups(options);
        setSelectedGroup(options.length > 0 ? options[0].value : "");
      } catch (e) {
        console.error("Failed to load archive groups:", e);
        setError(e.message || "Ошибка загрузки туров архива.");
        setGroups([]);
        setSelectedGroup("");
      }
    })();
  }, [selectedLeague, selectedSeason]);

  // 4. Загрузка матчей при выборе тура
  useEffect(() => {
    if (!selectedLeague || !selectedSeason || !selectedGroup) {
      setMatches([]);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchArchiveMatches(
          selectedLeague,
          selectedSeason,
          selectedGroup,
        );
        setMatches(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load archive matches:", e);
        setError(e.message || "Ошибка загрузки матчей архива.");
        setMatches([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedLeague, selectedSeason, selectedGroup]);

  return (
    <div className="archive-page">
      <h2>Архив чемпионатов</h2>

      <section className="controls">
        <div className="control">
          <label>Лига</label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
          >
            {leagues.length === 0 ? (
              <option value="">Нет доступных лиг</option>
            ) : (
              leagues.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="control">
          <label>Сезон</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            disabled={seasons.length === 0}
          >
            {seasons.length === 0 ? (
              <option value="">Нет доступных сезонов</option>
            ) : (
              seasons.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="control">
          <label>Тур</label>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            disabled={groups.length === 0}
          >
            {groups.length === 0 ? (
              <option value="">Нет доступных туров</option>
            ) : (
              groups.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))
            )}
          </select>
        </div>
      </section>

      <section className="content">
        {loading && <div className="info">Загружаем матчи...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && (
          <MatchesTable matches={matches} />
        )}
      </section>
    </div>
  );
}
