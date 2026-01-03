// src/pages/BoardPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchBoard } from "../api";
import { BoardFilters } from "../components/BoardFilters";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";
import MatchDetailsModal from "../components/MatchDetailsModal";

const DEFAULT_REFRESH_SECONDS = 30;

// “оперативное” окно для live/upcoming
const MAIN_DAYS_BACK = 1;
const MAIN_DAYS_AHEAD = 2;

// recent листаем неделями
const WEEK_SIZE_DAYS = 7;

function normalizeDefaultLeagues(defaultLeagues) {
  if (Array.isArray(defaultLeagues) && defaultLeagues.length > 0) {
    return defaultLeagues.map((x) => String(x).trim()).filter(Boolean);
  }
  return ["bl1"];
}

function uniq(arr) {
  return Array.from(
    new Set(
      (Array.isArray(arr) ? arr : []).map((x) => String(x).trim()).filter(Boolean)
    )
  );
}

export function BoardPage({ defaultLeagues, defaultSeason, refreshSeconds }) {
  const initialLeagues = useMemo(
    () => normalizeDefaultLeagues(defaultLeagues),
    [defaultLeagues]
  );

  const [selectedLeagues, setSelectedLeagues] = useState(() => initialLeagues);

  // сезон фиксируем для доски
  const season = useMemo(() => {
    const n = Number(defaultSeason);
    if (Number.isFinite(n) && n > 2000) return n;
    return new Date().getFullYear();
  }, [defaultSeason]);

  // live/upcoming + мета “main”
  const [mainMeta, setMainMeta] = useState({ date_from: null, date_to: null, leagues: [] });
  const [live, setLive] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  // recent “страница”
  const [recentWeekOffset, setRecentWeekOffset] = useState(0);
  const [recentMeta, setRecentMeta] = useState({ date_from: null, date_to: null });
  const [recent, setRecent] = useState([]);

  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
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

  const loadMain = async ({ showLoader = false } = {}) => {
    if (showLoader) setLoadingMain(true);
    try {
      setError(null);
      const data = await fetchBoard({
        leagues: selectedLeagues,
        season,
        daysBack: MAIN_DAYS_BACK,
        daysAhead: MAIN_DAYS_AHEAD,
      });

      setMainMeta({
        date_from: data.date_from || null,
        date_to: data.date_to || null,
        leagues: data.leagues || [],
      });
      setLive(data.live || []);
      setUpcoming(data.upcoming || []);
    } catch (e) {
      console.error("Failed to fetch main board:", e);
      setError(e?.message || "Ошибка загрузки данных.");
    } finally {
      if (showLoader) setLoadingMain(false);
    }
  };

  const loadRecentWeek = async (weekOffset, { showLoader = false } = {}) => {
    if (showLoader) setLoadingRecent(true);
    try {
      setError(null);

      const daysBack = (weekOffset + 1) * WEEK_SIZE_DAYS;
      const daysAhead = weekOffset * WEEK_SIZE_DAYS;

      const data = await fetchBoard({
        leagues: selectedLeagues,
        season,
        daysBack,
        daysAhead,
      });

      setRecentMeta({
        date_from: data.date_from || null,
        date_to: data.date_to || null,
      });
      setRecent(data.recent || []);
    } catch (e) {
      console.error("Failed to fetch recent week:", e);
      setError(e?.message || "Ошибка загрузки данных.");
    } finally {
      if (showLoader) setLoadingRecent(false);
    }
  };

  // при смене лиг/сезона — main + recent(0), и таймер только для main
  useEffect(() => {
    setRecentWeekOffset(0);

    (async () => {
      await Promise.all([
        loadMain({ showLoader: true }),
        loadRecentWeek(0, { showLoader: true }),
      ]);
    })();

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshMs > 0) {
      intervalRef.current = setInterval(() => {
        loadMain({ showLoader: false });
      }, refreshMs);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeagues, season, refreshMs]);

  // листаем recent — отдельная загрузка
  useEffect(() => {
    loadRecentWeek(recentWeekOffset, { showLoader: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentWeekOffset]);

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

  const recentRangeText =
    recentMeta.date_from && recentMeta.date_to
      ? `${recentMeta.date_from} — ${recentMeta.date_to}`
      : "—";

  const isEmpty =
    !loadingMain &&
    !loadingRecent &&
    !error &&
    (live?.length ?? 0) === 0 &&
    (upcoming?.length ?? 0) === 0 &&
    (recent?.length ?? 0) === 0;

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
        showDaysRange={false}
      />

      <section className="controls" style={{ marginTop: 12 }}>
        <div className="control">
          <label>Сезон</label>
          <div style={{ paddingTop: 10 }}>{season}</div>
        </div>

        <div className="control">
          <label>Live/Upcoming окно</label>
          <div style={{ paddingTop: 10 }}>
            {MAIN_DAYS_BACK} назад / {MAIN_DAYS_AHEAD} вперёд
          </div>
        </div>

        <div className="control">
          <label>Live/Upcoming диапазон</label>
          <div style={{ paddingTop: 10 }}>
            {mainMeta.date_from && mainMeta.date_to
              ? `${mainMeta.date_from} — ${mainMeta.date_to}`
              : "—"}
          </div>
        </div>

        <div className="control">
          <label>Лиги (факт из API)</label>
          <div style={{ paddingTop: 10 }}>
            {Array.isArray(mainMeta.leagues) && mainMeta.leagues.length > 0
              ? mainMeta.leagues.join(", ")
              : "—"}
          </div>
        </div>
      </section>

      {(loadingMain || loadingRecent) && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}

      {isEmpty && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            Матчей не найдено. Попробуйте выбрать другие лиги или перейти на прошлую
            неделю в блоке Recent.
          </p>
        </div>
      )}

      <LiveMatchesSection matches={live} onMatchClick={handleMatchClick} />
      <UpcomingMatchesSection matches={upcoming} onMatchClick={handleMatchClick} />

      <RecentMatchesSection
        matches={recent}
        onMatchClick={handleMatchClick}
        weekOffset={recentWeekOffset}
        rangeText={recentRangeText}
        isLoading={loadingRecent}
        onPrevWeek={() => setRecentWeekOffset((w) => w + 1)} // старее
        onNextWeek={() => setRecentWeekOffset((w) => Math.max(0, w - 1))} // ближе
      />

      <MatchDetailsModal isOpen={isModalOpen} onClose={closeModal} match={selectedMatch} />
    </div>
  );
}

export default BoardPage;
