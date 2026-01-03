import React from "react";
import { MatchesTable } from "./MatchesTable";

/**
 * weekOffset: 0 = последние 7 дней, 1 = 7–14 дней назад, и т.д.
 * rangeText: строка вида "2025-12-23 — 2026-01-06" (или "-")
 */
export function RecentMatchesSection({
  matches,
  onMatchClick,
  weekOffset = 0,
  rangeText = "—",
  onPrevWeek,
  onNextWeek,
  isLoading = false,
}) {
  return (
    <section style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div>
          <h3 style={{ marginBottom: 4 }}>Recent</h3>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            Неделя: {weekOffset} • Диапазон: {rangeText}
            {isLoading ? " • обновление…" : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onNextWeek} disabled={weekOffset <= 0}>
            ← Ближе
          </button>
          <button type="button" onClick={onPrevWeek}>
            Старее →
          </button>
        </div>
      </div>

      <MatchesTable
        matches={matches}
        onMatchClick={onMatchClick}
        emptyText="Нет recent-матчей."
        variant="board"
      />
    </section>
  );
}
