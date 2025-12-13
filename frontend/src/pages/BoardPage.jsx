// frontend/src/pages/BoardPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchBoard } from "../api";
import { BoardFilters } from "../components/BoardFilters";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";

const DEFAULT_REFRESH_SECONDS = 30;

function normalizeDefaultLeagues(defaultLeagues) {
  if (Array.isArray(defaultLeagues) && defaultLeagues.length > 0) {
    return defaultLeagues
      .map((x) => String(x).trim())
      .filter(Boolean);
  }
  return ["bl1"];
}

function clampInt(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

export function BoardPage({
  defaultLeagues,
  defaultSeason,
  defaultDaysBack,
  defaultDaysAhead,
  refreshSeconds,
}) {
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

  const initialLeagues = useMemo(
    () => normalizeDefaultLeagues(defaultLeagues),
    [defaultLeagues]
  );

  const [selectedLeagues, setSelectedLeagues] = useState(() => initialLeagues);

  // Сезон по умолчанию берём из runtime config (dev сейчас 2025)
  const [selectedSeason, setSelectedSeason] = useState(() =>
    defaultSeason ? String(defaultSeason) : ""
  );

  // Окно доски
  const [daysBack, setDaysBack] = useState(() =>
    clampInt(defaultDaysBack, { min: 0, max: 30, fallback: 7 })
  );
  const [daysAhead, setDaysAhead] = useState(() =>
    clampInt(defaultDaysAhead, { min: 0, max: 30, fallback: 7 })
  );

  const intervalRef = useRef(null);

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
      setError(e.message || "Ошибка загрузки данных.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const refreshMs =
    Math.max(
      0,
      clampInt(refreshSeconds, {
        min: 0,
        max: 3600,
        fallback: DEFAULT_REFRESH_SECONDS,
      })
    ) * 1000;

  useEffect(() => {
    const params = {
      leagues: selectedLeagues,
      season: selectedSeason ? Number(selectedSeason) : undefined,
      daysBack,
      daysAhead,
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
  }, [selectedLeagues, selectedSeason, daysBack, daysAhead, refreshMs]);

  const handleFiltersChange = ({ leagues, season }) => {
    const fallback = normalizeDefaultLeagues(defaultLeagues);
    const nextLeagues =
      Array.isArray(leagues) && leagues.length > 0 ? leagues : fallback;

    setSelectedLeagues(nextLeagues);
    // если сезон не задан, оставляем пусто -> backend возьмёт дефолт
    setSelectedSeason(season ? String(season) : "");
  };

  const handleResetDefaults = () => {
    setSelectedLeagues(initialLeagues);
    setSelectedSeason(defaultSeason ? String(defaultSeason) : "");
    setDaysBack(clampInt(defaultDaysBack, { min: 0, max: 30, fallback: 7 }));
    setDaysAhead(clampInt(defaultDaysAhead, { min: 0, max: 30, fallback: 7 }));
  };

  const leagueOptions = useMemo(() => {
    const leagues = normalizeDefaultLeagues(defaultLeagues);
    return leagues.map((x) => ({ value: x, label: x }));
  }, [defaultLeagues]);

  const seasonOptions = useMemo(() => {
    const base = defaultSeason ? Number(defaultSeason) : null;
    if (!base || !Number.isFinite(base)) return [];
    const years = [];
    for (let y = base + 1; y >= base - 8; y -= 1) years.push(y);
    return years.map((y) => ({ value: String(y), label: String(y) }));
  }, [defaultSeason]);

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
        valueSeason={selectedSeason}
        onChange={handleFiltersChange}
        onReset={handleResetDefaults}
        leagueOptions={leagueOptions}
        seasonOptions={seasonOptions}
      />

      {/* Окно по датам — визуально как в архиве (controls/control) */}
      <section className="controls" style={{ marginTop: 12 }}>
        <div className="control">
          <label>Дней назад</label>
          <input
            type="number"
            min={0}
            max={30}
            value={daysBack}
            onChange={(e) =>
              setDaysBack(
                clampInt(e.target.value, { min: 0, max: 30, fallback: 7 })
              )
            }
          />
        </div>

        <div className="control">
          <label>Дней вперёд</label>
          <input
            type="number"
            min={0}
            max={30}
            value={daysAhead}
            onChange={(e) =>
              setDaysAhead(
                clampInt(e.target.value, { min: 0, max: 30, fallback: 7 })
              )
            }
          />
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

      <div className="card" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Если выбрать сезон, который не соответствует текущим датам, доска будет
          пустой. Для “живых” матчей используйте актуальный сезон.
        </p>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}

      {isEmpty && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            Матчей не найдено в выбранном окне дат. Попробуй увеличить диапазон
            “Дней назад/вперёд” или сменить сезон.
          </p>
        </div>
      )}

      <LiveMatchesSection matches={board.live} />
      <UpcomingMatchesSection matches={board.upcoming} />
      <RecentMatchesSection matches={board.recent} />
    </div>
  );
}
