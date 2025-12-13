// src/components/RecentMatchesSection.jsx
import React from "react";
import { MatchesTable } from "./MatchesTable";

export function RecentMatchesSection({ matches, onMatchClick }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3>Recent</h3>
      <MatchesTable
        matches={matches}
        onMatchClick={onMatchClick}
        emptyText="Нет recent-матчей."
      />
    </section>
  );
}
