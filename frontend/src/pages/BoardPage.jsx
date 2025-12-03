// src/pages/BoardPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { fetchBoard } from "../api";
import { BoardFilters } from "../components/BoardFilters";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";

const REFRESH_INTERVAL_MS = 30_000; // 30 секунд

export function BoardPage() {
  const [board, setBoard] = useState({
    live: [],
    upcoming: [],
    recent: [],
  });

  const [loading, setLoading] = useState(false);   // для первой загрузки
  const [error, setError] = useState(null);

  const [selectedLeagues, setSelectedLeagues] = useState(["bl1"]);
  const [selectedSeason, setSelectedSeason] = useState("");

  const intervalRef = useRef(null);

  /**
   * Загрузка данных с /api/board.
   * showLoader = true — показываем "Загрузка..." (первая загрузка или смена фильтров).
   * showLoader = false — тихое обновление по таймеру.
   */
  const loadBoard = async (params, { showLoader = false } = {}) => {
    if (showLoader) {
      setLoading(true);
    }
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
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  /**
   * Эффект:
   * - срабатывает при изменении selectedLeagues / selectedSeason;
   * - делает мгновенную загрузку (с лоадером);
   * - запускает setInterval с обновлением каждые REFRESH_INTERVAL_MS;
   * - при очистке эффекта/размонтаже очищает таймер.
   */
  useEffect(() => {
    const params = {
      leagues: selectedLeagues,
      season: selectedSeason || undefined,
    };

    // 1) первая загрузка при изменении фильтров
    loadBoard(params, { showLoader: true });

    // 2) очищаем старый интервал, если был
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // 3) запускаем новый интервал
    intervalRef.current = setInterval(() => {
      loadBoard(params, { showLoader: false });
    }, REFRESH_INTERVAL_MS);

    // 4) очистка при размонтировании / перед следующим запуском эффекта
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
