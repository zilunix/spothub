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
    <section className="board-block recent-block">
      <div className="board-block__head recent-head">
        <div className="board-block__title recent-title">
          <h3 className="board-block__h3 recent-h3">Recent</h3>
          <span className="board-pill">{groups?.length ?? 0}</span>
        </div>

        <div className="recent-nav">
          <button
            type="button"
            className="recent-btn recent-btn-ghost"
            onClick={onNewer}
            disabled={!hasNewer}
          >
            ← Ближе
          </button>

          <button
            type="button"
            className="recent-btn recent-btn-primary"
            onClick={onOlder}
            disabled={!hasOlder}
          >
            Старее →
          </button>
        </div>
      </div>

      <div className="recent-sub" style={{ marginBottom: 10 }}>
        {roundsLabel} • По {pageSizeRounds} тура • Диапазон: {rangeText}
        {isLoading ? " • обновление…" : ""}
      </div>

      {groups.length === 0 ? (
        <div className="board-empty">Нет recent-матчей.</div>
      ) : (
        <div className="recent-groups">
          {groups.map((g) => (
            <div key={g.round}>
              <div className="recent-round-title">
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
