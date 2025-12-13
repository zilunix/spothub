// src/components/LiveMatchesSection.jsx
import React from "react";
import { MatchesTable } from "./MatchesTable";

export function LiveMatchesSection({ matches, onMatchClick }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3>Live</h3>
      <MatchesTable
        matches={matches}
        onMatchClick={onMatchClick}
        emptyText="Нет live-матчей."
      />
    </section>
  );
}
