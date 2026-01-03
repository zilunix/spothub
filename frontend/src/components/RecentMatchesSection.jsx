import React from "react";
import { MatchesTable } from "./MatchesTable";

/**
 * groups: [{ round: number, matches: Match[] }]
 */
export function RecentMatchesSection({
  groups = [],
  onMatchClick,

  pageSizeRounds = 3,
  rangeText = "—",

  hasNewer = false,
  hasOlder = false,
  onNewer,
  onOlder,

  isLoading = false,
}) {
  const topRound = groups?.[0]?.round;
  const bottomRound = groups?.[groups.length - 1]?.round;

  const roundsLabel =
    topRound != null && bottomRound != null
      ? `Туры: ${topRound}–${bottomRound}`
      : `Туры: —`;

  return (
    <section style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <h3 style={{ marginBottom: 4 }}>Recent</h3>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            {roundsLabel} • По {pageSizeRounds} тура • Диапазон: {rangeText}
            {isLoading ? " • обновление…" : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onNewer} disabled={!hasNewer}>
            ← Ближе
          </button>
          <button type="button" onClick={onOlder} disabled={!hasOlder}>
            Старее →
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div>Нет recent-матчей.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {groups.map((g) => (
            <div key={g.round}>
              <div
                style={{
                  opacity: 0.85,
                  fontWeight: 600,
                  marginBottom: 8,
                  letterSpacing: 0.3,
                }}
              >
                {"=".repeat(11)} {g.round} тур {"=".repeat(11)}
              </div>

              <MatchesTable
                matches={g.matches}
                onMatchClick={onMatchClick}
                emptyText="Нет матчей в этом туре."
                variant="board"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
