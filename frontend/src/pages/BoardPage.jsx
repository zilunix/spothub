import React, { useEffect, useRef, useState } from "react";
import { fetchBoard } from "../api";
import { BoardFilters } from "../components/BoardFilters";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";

const DEFAULT_REFRESH_SECONDS = 30;

function normalizeDefaultLeagues(defaultLeagues) {
  if (Array.isArray(defaultLeagues) && defaultLeagues.length > 0) {
    return defaultLeagues;
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

  const initialLeagues = normalizeDefaultLeagues(defaultLeagues);

  const [selectedLeagues, setSelectedLeagues] = useState(() => initialLeagues);

  // Важно: сезон по умолчанию берём из runtime config (dev сейчас 2025)
  const [selectedSeason, setSelectedSeason] = useState(() =>
    defaultSeason ? String(defaultSeason) : ""
  );

  // Окно доски по умолчанию тоже можно брать из runtime config
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

    // если сезон не задан, оставляем пусто -> backend возьмёт дефолт (2025)
    setSelectedSeason(season ? String(season) : "");
  };

  const handleResetDefaults = () => {
    setSelectedLeagues(initialLeagues);
    setSelectedSeason(defaultSeason ? String(defaultSeason) : "");
    setDaysBack(clampInt(defaultDaysBack, { min: 0, max: 30, fallback: 7 }));
    setDaysAhead(clampInt(defaultDaysAhead, { min: 0, max: 30, fallback: 7 }));
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
        valueSeason={selectedSeason}
        onChange={handleFiltersChange}
      />

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ opacity: 0.8 }}>Дней назад</span>
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
              style={{ width: 140 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ opacity: 0.8 }}>Дней вперёд</span>
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
              style={{ width: 140 }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ opacity: 0.8 }}>Диапазон</span>
            <div style={{ paddingTop: 10 }}>
              {board.date_from && board.date_to
                ? `${board.date_from} — ${board.date_to}`
                : "—"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ opacity: 0.8 }}>Лиги (факт из API)</span>
            <div style={{ paddingTop: 10 }}>
              {Array.isArray(board.leagues) && board.leagues.length > 0
                ? board.leagues.join(", ")
                : "—"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" className="tab" onClick={handleResetDefaults}>
              Сбросить
            </button>
          </div>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.8 }}>
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
