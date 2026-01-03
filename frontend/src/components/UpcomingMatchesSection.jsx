import React from "react";
import { MatchesTable } from "./MatchesTable";

export function UpcomingMatchesSection({ matches, onMatchClick }) {
  const count = Array.isArray(matches) ? matches.length : 0;

  return (
    <section className="board-block">
      <div className="board-block__head">
        <div className="board-block__title">
          <h3 className="board-block__h3">Upcoming</h3>
          <span className="board-pill">{count}</span>
        </div>
      </div>

      <div className="board-block__body">
        {count === 0 ? (
          <div className="board-empty">Нет upcoming-матчей.</div>
        ) : (
          <div className="board-table-wrap">
            <MatchesTable matches={matches} onMatchClick={onMatchClick} variant="board" />
          </div>
        )}
      </div>
    </section>
  );
}
