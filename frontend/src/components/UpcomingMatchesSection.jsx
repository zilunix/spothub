// src/components/UpcomingMatchesSection.jsx
import React from "react";
import { MatchesTable } from "./MatchesTable";

export function UpcomingMatchesSection({ matches, onMatchClick }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3>Upcoming</h3>
      <MatchesTable
        matches={matches}
        onMatchClick={onMatchClick}
        emptyText="Нет upcoming-матчей."
      />
    </section>
  );
}
