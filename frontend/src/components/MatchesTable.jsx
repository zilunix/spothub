// src/components/MatchesTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getAvailableTeams } from "../services/openLigaClient";

/**
 * Кэш и дедуп запросов на логотипы (на время жизни страницы).
 * key = `${league}:${season}` -> Map(teamNameLower -> iconUrl)
 */
const teamNameIconCache = new Map();
const teamNameIconPending = new Map();

function normName(s) {
  return String(s || "").trim().toLowerCase();
}

function formatKickoff(kickoffUtc) {
  if (!kickoffUtc) return "-";
  const d = new Date(kickoffUtc);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScore(m) {
  const a = m?.score_team1;
  const b = m?.score_team2;
  if (a === null || a === undefined || b === null || b === undefined) return "- : -";
  return `${a} : ${b}`;
}

function formatStatusShort(status) {
  switch (status) {
    case "SCHEDULED":
      return "NS";
    case "LIVE":
      return "LIVE";
    case "FINISHED":
      return "FT";
    default:
      return status || "-";
  }
}

function formatStatusLong(status) {
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

function StatusBadge({ status }) {
  const s = formatStatusShort(status);
  return (
    <span
      title={formatStatusLong(status)}
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.20)",
        fontSize: 12,
        lineHeight: "18px",
        whiteSpace: "nowrap",
      }}
    >
      {s}
    </span>
  );
}

function TeamLogo({ src }) {
  if (!src) {
    // фиксируем ширину, чтобы колонки не "прыгали"
    return <span style={{ display: "inline-block", width: 18, height: 18 }} />;
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      style={{ width: 18, height: 18, objectFit: "contain" }}
      onError={(e) => {
        // если битая ссылка — скрываем картинку, чтобы не было "сломанных" иконок
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

async function ensureTeamNameIconMap(league, season) {
  const key = `${league}:${season}`;
  if (teamNameIconCache.has(key)) return teamNameIconCache.get(key);

  if (teamNameIconPending.has(key)) return teamNameIconPending.get(key);

  const p = (async () => {
    const teams = await getAvailableTeams(league, season);
    const m = new Map();
    if (Array.isArray(teams)) {
      for (const t of teams) {
        const name = t?.teamName ?? t?.TeamName;
        const icon = t?.teamIconUrl ?? t?.TeamIconUrl;
        if (name && icon) m.set(normName(name), String(icon));
      }
    }
    teamNameIconCache.set(key, m);
    teamNameIconPending.delete(key);
    return m;
  })();

  teamNameIconPending.set(key, p);
  return p;
}

/**
 * variant:
 * - "full"  (по умолчанию): текущий “широкий” формат (удобен для архива/отладки)
 * - "board" : компактный формат под доску + логотипы
 */
export function MatchesTable({
  matches,
  onMatchClick,
  emptyText = "Нет матчей для отображения.",
  variant = "full",
}) {
  const clickable = typeof onMatchClick === "function";
  const [, forceRerender] = useState(0);

  const leagueSeasonKeys = useMemo(() => {
    if (!Array.isArray(matches)) return [];
    const keys = new Set();
    for (const m of matches) {
      const l = m?.league_shortcut;
      const s = m?.league_season;
      if (l && s) keys.add(`${l}:${s}`);
    }
    return Array.from(keys).sort();
  }, [matches]);

  // Подгружаем логотипы только для board-режима
  useEffect(() => {
    if (variant !== "board") return;
    let cancelled = false;

    (async () => {
      for (const key of leagueSeasonKeys) {
        const [league, seasonStr] = key.split(":");
        const season = Number(seasonStr);
        if (!league || !season) continue;

        await ensureTeamNameIconMap(league, season);
        if (!cancelled) forceRerender((x) => x + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [variant, leagueSeasonKeys.join("|")]);

  if (!matches || matches.length === 0) {
    return <div>{emptyText}</div>;
  }

  const rowPropsFor = (m) =>
    clickable
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

  const getIcon = (m, teamName) => {
    const key = `${m?.league_shortcut}:${m?.league_season}`;
    const idx = teamNameIconCache.get(key);
    if (!idx) return null;
    return idx.get(normName(teamName)) || null;
  };

  if (variant === "board") {
    return (
      <table className="matches-table matches-table--board" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ width: 90, textAlign: "left", padding: "10px 12px" }}>Время</th>
            <th style={{ textAlign: "left", padding: "10px 12px" }}>Хозяева</th>
            <th style={{ width: 90, textAlign: "center", padding: "10px 12px" }}>Счёт</th>
            <th style={{ textAlign: "left", padding: "10px 12px" }}>Гости</th>
            <th style={{ width: 80, textAlign: "center", padding: "10px 12px" }}>Статус</th>
          </tr>
        </thead>

        <tbody>
          {matches.map((m) => {
            const t1Icon = getIcon(m, m.team1_name);
            const t2Icon = getIcon(m, m.team2_name);

            return (
              <tr
                key={m.id}
                {...rowPropsFor(m)}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <td style={{ padding: "10px 12px", opacity: 0.85, fontSize: 12 }}>
                  {formatKickoff(m.kickoff_utc)}
                </td>

                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <TeamLogo src={t1Icon} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.team1_name || "-"}
                    </span>
                  </div>
                </td>

                <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>
                  {formatScore(m)}
                </td>

                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.team2_name || "-"}
                    </span>
                    <TeamLogo src={t2Icon} />
                  </div>

                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                    {(m.league_shortcut || "").toUpperCase()}
                    {m.group_order_id != null ? ` • Тур ${m.group_order_id}` : ""}
                  </div>
                </td>

                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  <StatusBadge status={m.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // full (ваш прежний формат, чтобы архив/отладка не пострадали)
  return (
    <table className="matches-table" style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "10px 12px" }}>Лига</th>
          <th style={{ textAlign: "left", padding: "10px 12px" }}>Сезон</th>
          <th style={{ textAlign: "left", padding: "10px 12px" }}>Тур</th>
          <th style={{ textAlign: "left", padding: "10px 12px" }}>Команда 1</th>
          <th style={{ textAlign: "left", padding: "10px 12px" }}>Команда 2</th>
          <th style={{ textAlign: "center", padding: "10px 12px" }}>Счёт</th>
          <th style={{ textAlign: "left", padding: "10px 12px" }}>Время начала</th>
          <th style={{ textAlign: "left", padding: "10px 12px" }}>Статус</th>
        </tr>
      </thead>

      <tbody>
        {matches.map((m) => (
          <tr key={m.id} {...rowPropsFor(m)} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <td style={{ padding: "10px 12px" }}>{m.league_shortcut}</td>
            <td style={{ padding: "10px 12px" }}>{m.league_season}</td>
            <td style={{ padding: "10px 12px" }}>{m.group_order_id}</td>
            <td style={{ padding: "10px 12px" }}>{m.team1_name}</td>
            <td style={{ padding: "10px 12px" }}>{m.team2_name}</td>
            <td style={{ padding: "10px 12px", textAlign: "center" }}>{formatScore(m)}</td>
            <td style={{ padding: "10px 12px" }}>{formatKickoff(m.kickoff_utc)}</td>
            <td style={{ padding: "10px 12px" }}>{formatStatusLong(m.status)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
