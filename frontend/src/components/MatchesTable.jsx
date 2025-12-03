// src/components/MatchesTable.jsx
import React from "react";

function formatKickoff(kickoffUtc) {
  if (!kickoffUtc) return "-";
  const d = new Date(kickoffUtc);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatStatus(status) {
  switch (status) {
    case "SCHEDULED":
      return "Запланирован";
    case "LIVE":
      return "Идёт";
    case "FINISHED":
      return "Завершён";
    default:
      return status || "-";
  }
}

/**
 * ИМЕНОВАННЫЙ экспорт MatchesTable — то, что важно для импорта:
 * import { MatchesTable } from "./MatchesTable";
 */
export function MatchesTable({ matches }) {
  if (!matches || matches.length === 0) {
    return <div>Нет матчей для отображения.</div>;
  }

  return (
    <table className="matches-table">
      <thead>
        <tr>
          <th>Лига</th>
          <th>Тур</th>
          <th>Команда 1</th>
          <th>Команда 2</th>
          <th>Счёт</th>
          <th>Время</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        {matches.map((m) => (
          <tr key={m.id}>
            <td>{m.league_shortcut}</td>
            <td>{m.group_order_id}</td>
            <td>{m.team1_name}</td>
            <td>{m.team2_name}</td>
            <td>
              {m.score_team1 != null && m.score_team2 != null
                ? `${m.score_team1} : ${m.score_team2}`
                : "-"}
            </td>
            <td>{formatKickoff(m.kickoff_utc)}</td>
            <td>{formatStatus(m.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
