// src/components/MatchesTable.jsx
import React from "react";

function formatKickoff(kickoffUtc) {
  if (!kickoffUtc) return "-";
  const d = new Date(kickoffUtc);

  // Локальное время пользователя
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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

function formatScore(m) {
  return m.score_team1 != null && m.score_team2 != null
    ? `${m.score_team1} : ${m.score_team2}`
    : "-";
}

export function MatchesTable({
  matches,
  onMatchClick, // (match) => void
  emptyText = "Нет матчей для отображения.",
}) {
  const clickable = typeof onMatchClick === "function";

  if (!matches || matches.length === 0) {
    return <div>{emptyText}</div>;
  }

  return (
    <table className="matches-table">
      <thead>
        <tr>
          <th>Лига</th>
          <th>Сезон</th>
          <th>Тур</th>
          <th>Команда 1</th>
          <th>Команда 2</th>
          <th>Счёт</th>
          <th>Время начала</th>
          <th>Статус</th>
        </tr>
      </thead>

      <tbody>
        {matches.map((m) => {
          const rowProps = clickable
            ? {
                role: "button",
                tabIndex: 0,
                title: "Открыть детали матча",
                onClick: () => onMatchClick(m),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onMatchClick(m);
                  }
                },
                style: { cursor: "pointer" },
              }
            : {};

          return (
            <tr key={m.id} {...rowProps}>
              <td>{m.league_shortcut}</td>
              <td>{m.league_season}</td>
              <td>{m.group_order_id}</td>
              <td>{m.team1_name}</td>
              <td>{m.team2_name}</td>
              <td>{formatScore(m)}</td>
              <td>{formatKickoff(m.kickoff_utc)}</td>
              <td>{formatStatus(m.status)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
