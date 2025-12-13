// src/pages/BoardPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchBoard } from "../api";
import { BoardFilters } from "../components/BoardFilters";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";
import MatchDetailsModal from "../components/MatchDetailsModal";

const DEFAULT_REFRESH_SECONDS = 30;

// фиксированное окно для доски (без UI)
const BOARD_DAYS_BACK = 7;
const BOARD_DAYS_AHEAD = 7;

function normalizeDefaultLeagues(defaultLeagues) {
  if (Array.isArray(defaultLeagues) && defaultLeagues.length > 0) {
    return defaultLeagues.map((x) => String(x).trim()).filter(Boolean);
  }
  return ["bl1"];
}

function uniq(arr) {
  return Array.from(
    new Set(
      (Array.isArray(arr) ? arr : [])
        .map((x) => String(x).trim())
        .filter(Boolean)
    )
  );
}

export function BoardPage({ defaultLeagues, defaultSeason, refreshSeconds }) {
  const initialLeagues = useMemo(
    () => normalizeDefaultLeagues(defaultLeagues),
    [defaultLeagues]
  );

  const [selectedLeagues, setSelectedLeagues] = useState(() => initialLeagues);

  // “оперативная доска”: сезон фиксируем
  const season = useMemo(() => {
    const n = Number(defaultSeason);
    if (Number.isFinite(n) && n > 2000) return n;
    return new Date().getFullYear();
  }, [defaultSeason]);

  const [board, setBoard] = useState({
    date_from: null,
    date_to: null,
    leagues: [],
    live: [],
    upcoming: [],
    recent: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // modal state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const intervalRef = useRef(null);

  const leagueOptions = useMemo(() => {
    const base = ["bl1", "bl2"];
    const extra = normalizeDefaultLeagues(defaultLeagues);
    const merged = uniq([...base, ...extra]);
    return merged.map((x) => ({ value: x, label: x.toUpperCase() }));
  }, [defaultLeagues]);

  const refreshMs =
    Math.max(0, Number(refreshSeconds ?? DEFAULT_REFRESH_SECONDS)) * 1000;

  const loadBoard = async (params, { showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    try {
      setError(null);
      const data = await fetchBoard(params);

      setBoard({
        date_from: data.date_from || null,
        date_to: data.date_to || null,
        leagues: data.leagues || [],
        live: data.live || [],
        upcoming: data.upcoming || [],
        recent: data.recent || [],
      });
    } catch (e) {
      console.error("Failed to fetch board:", e);
      setError(e?.message || "Ошибка загрузки данных.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    const params = {
      leagues: selectedLeagues,
      season,
      daysBack: BOARD_DAYS_BACK,
      daysAhead: BOARD_DAYS_AHEAD,
    };

    loadBoard(params, { showLoader: true });

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshMs > 0) {
      intervalRef.current = setInterval(() => {
        loadBoard(params, { showLoader: false });
      }, refreshMs);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedLeagues, season, refreshMs]);

  const handleFiltersChange = ({ leagues }) => {
    const fallback = normalizeDefaultLeagues(defaultLeagues);
    const nextLeagues =
      Array.isArray(leagues) && leagues.length > 0 ? leagues : fallback;
    setSelectedLeagues(nextLeagues);
  };

  const handleResetDefaults = () => {
    setSelectedLeagues(initialLeagues);
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMatch(null);
  };

  const isEmpty =
    !loading &&
    !error &&
    (board.live?.length ?? 0) === 0 &&
    (board.upcoming?.length ?? 0) === 0 &&
    (board.recent?.length ?? 0) === 0;

  return (
    <div className="board-page">
      <h2>Спортивная доска</h2>

      <BoardFilters
        valueLeagues={selectedLeagues}
        valueSeason={String(season)}
        onChange={handleFiltersChange}
        onReset={handleResetDefaults}
        leagueOptions={leagueOptions}
        showSeason={false}
      />

      <section className="controls" style={{ marginTop: 12 }}>
        <div className="control">
          <label>Сезон</label>
          <div style={{ paddingTop: 10 }}>{season}</div>
        </div>

        <div className="control">
          <label>Окно</label>
          <div style={{ paddingTop: 10 }}>
            {BOARD_DAYS_BACK} назад / {BOARD_DAYS_AHEAD} вперёд
          </div>
        </div>

        <div className="control">
          <label>Диапазон</label>
          <div style={{ paddingTop: 10 }}>
            {board.date_from && board.date_to
              ? `${board.date_from} — ${board.date_to}`
              : "—"}
          </div>
        </div>

        <div className="control">
          <label>Лиги (факт из API)</label>
          <div style={{ paddingTop: 10 }}>
            {Array.isArray(board.leagues) && board.leagues.length > 0
              ? board.leagues.join(", ")
              : "—"}
          </div>
        </div>
      </section>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}

      {isEmpty && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            Матчей не найдено в фиксированном окне дат. Для расширенных выборок
            используйте Архив.
          </p>
        </div>
      )}

      <LiveMatchesSection matches={board.live} onMatchClick={handleMatchClick} />
      <UpcomingMatchesSection matches={board.upcoming} onMatchClick={handleMatchClick} />
      <RecentMatchesSection matches={board.recent} onMatchClick={handleMatchClick} />

      <MatchDetailsModal
        isOpen={isModalOpen}
        onClose={closeModal}
        match={selectedMatch}
      />
    </div>
  );
}

export default BoardPage;
