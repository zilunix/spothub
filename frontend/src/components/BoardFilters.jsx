// src/components/BoardFilters.jsx
import React, { useState, useEffect } from "react";

export function BoardFilters({ valueLeagues, valueSeason, onChange }) {
  const [localLeagues, setLocalLeagues] = useState(valueLeagues || []);
  const [localSeason, setLocalSeason] = useState(valueSeason || "");

  useEffect(() => {
    setLocalLeagues(valueLeagues || []);
  }, [valueLeagues]);

  useEffect(() => {
    setLocalSeason(valueSeason || "");
  }, [valueSeason]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onChange({
      leagues: localLeagues,
      season: localSeason || undefined,
    });
  };

  const handleLeaguesChange = (e) => {
    const parts = e.target.value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    setLocalLeagues(parts);
  };

  return (
    <form onSubmit={handleSubmit} className="board-filters">
      <div>
        <label>
          Лиги (через запятую):
          <input
            type="text"
            value={localLeagues.join(", ")}
            onChange={handleLeaguesChange}
            placeholder="например: bl1, bl2"
          />
        </label>
      </div>

      <div>
        <label>
          Сезон:
          <input
            type="number"
            value={localSeason}
            onChange={(e) => setLocalSeason(e.target.value)}
            placeholder="2024"
          />
        </label>
      </div>

      <button type="submit">Применить</button>
    </form>
  );
}
