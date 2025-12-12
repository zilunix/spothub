import React, { useEffect, useRef, useState } from "react";
import { fetchBoard } from "../api";
import { BoardFilters } from "../components/BoardFilters";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";

const REFRESH_INTERVAL_MS = 30_000; // 30 секунд

function normalizeDefaultLeagues(defaultLeagues) {
  if (Array.isArray(defaultLeagues) && defaultLeagues.length > 0) {
    return defaultLeagues;
  }
  return ["bl1"];
}

export function BoardPage({ defaultLeagues }) {
  const [board, setBoard] = useState({
    live: [],
    upcoming: [],
    recent: [],
  });

  const [loading, setLoading] = useState(false); // для первой загрузки
  const [error, setError] = useState(null);

  const initialLeagues = normalizeDefaultLeagues(defaultLeagues);

  const [selectedLeagues, setSelectedLeagues] = useState(() => initialLeagues);
  const [selectedSeason, setSelectedSeason] = useState("");

  const intervalRef = useRef(null);

  const loadBoard = async (params, { showLoader = false } = {}) => {
    if (showLoader) setLoading(true);

    try {
      setError(null);
      const data = await fetchBoard(params);
      setBoard({
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

  useEffect(() => {
    const params = {
      leagues: selectedLeagues,
      season: selectedSeason || undefined,
    };

    loadBoard(params, { showLoader: true });

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      loadBoard(params, { showLoader: false });
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedLeagues, selectedSeason]);

  const handleFiltersChange = ({ leagues, season }) => {
    const fallback = normalizeDefaultLeagues(defaultLeagues);
    const nextLeagues =
      Array.isArray(leagues) && leagues.length > 0 ? leagues : fallback;

    setSelectedLeagues(nextLeagues);
    setSelectedSeason(season || "");
  };

  return (
    <div className="board-page">
      <h2>Спортивная доска</h2>

      <BoardFilters
        valueLeagues={selectedLeagues}
        valueSeason={selectedSeason}
        onChange={handleFiltersChange}
      />

      {loading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}

      <LiveMatchesSection matches={board.live} />
      <UpcomingMatchesSection matches={board.upcoming} />
      <RecentMatchesSection matches={board.recent} />
    </div>
  );
}
