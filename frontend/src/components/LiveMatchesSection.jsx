// src/components/LiveMatchesSection.jsx
import React from "react";
import { MatchesTable } from "./MatchesTable";

export function LiveMatchesSection({ matches }) {
  return (
    <section>
      <h2>Матчи в прямом эфире</h2>
      {(!matches || matches.length === 0) ? (
        <p>Сейчас нет матчей в прямом эфире.</p>
      ) : (
        <MatchesTable matches={matches} />
      )}
    </section>
  );
}
