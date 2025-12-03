// src/components/UpcomingMatchesSection.jsx
import React from "react";
import { MatchesTable } from "./MatchesTable";

export function UpcomingMatchesSection({ matches }) {
  return (
    <section>
      <h2>Ближайшие матчи</h2>
      {(!matches || matches.length === 0) ? (
        <p>Ближайших матчей нет.</p>
      ) : (
        <MatchesTable matches={matches} />
      )}
    </section>
  );
}
