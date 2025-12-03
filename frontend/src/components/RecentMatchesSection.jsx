// src/components/RecentMatchesSection.jsx
import React from "react";
import { MatchesTable } from "./MatchesTable";

export function RecentMatchesSection({ matches }) {
  return (
    <section>
      <h2>Прошедшие матчи</h2>
      {(!matches || matches.length === 0) ? (
        <p>Пока нет прошедших матчей для отображения.</p>
      ) : (
        <MatchesTable matches={matches} />
      )}
    </section>
  );
}
