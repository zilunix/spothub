import React, { useEffect, useState, useRef } from "react";
import { fetchBoard } from "../api";
import { BoardFilters } from "../components/BoardFilters";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";

const REFRESH_INTERVAL_MS = 30000;

export function BoardPage() {
  const [board, setBoard] = useState({ live: [], upcoming: [], recent: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedLeagues, setSelectedLeagues] = useState(["bl1"]);
  const [selectedSeason, setSelectedSeason] = useState("");
  const intervalRef = useRef(null);

  const loadBoard = async (params) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBoard(params);
      setBoard({
        live: data.live || [],
        upcoming: data.upcoming || [],
        recent: data.recent || [],
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "Ошибка загрузки данных.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = {
      leagues: selectedLeagues,
      season: selectedSeason || undefined,
    };

    loadBoard(params);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      loadBoard(params);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedLeagues, selectedSeason]);

  const handleFiltersChange = ({ leagues, season }) => {
    setSelectedLeagues(leagues || []);
    setSelectedSeason(season || "");
  };

  return (
    <div className="board-page">
      <h1>Спортивная доска</h1>

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
