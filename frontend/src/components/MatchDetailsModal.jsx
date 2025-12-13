// src/components/MatchDetailsModal.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildTeamIconIndex,
  getAvailableTeams,
  getLeagueTable,
  getMatchDetails,
  safeCopyToClipboard,
} from "../services/openLigaClient";

function formatUtc(isoUtc) {
  if (!isoUtc) return "—";
  const d = new Date(isoUtc);
  return d.toLocaleString();
}

function initials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

function ModalShell({ isOpen, onClose, children }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          background: "#121212",
          color: "#fff",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(255,255,255,0.10)" : "transparent",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "8px 10px",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>{children}</span>
      {badge != null && (
        <span
          style={{
            fontSize: 12,
            opacity: 0.85,
            padding: "2px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function TeamLogo({ url, name, size = 44 }) {
  const [broken, setBroken] = useState(false);

  if (!url || broken) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
        }}
        title={name}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name}
      width={size}
      height={size}
      onError={() => setBroken(true)}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 10,
        padding: 6,
      }}
    />
  );
}

function pickFinalScoreFromDetails(details) {
  // Пробуем достать “финальный” результат из matchResults (обычно typeId=2)
  const results = Array.isArray(details?.matchResults) ? details.matchResults : [];
  const ft = results.find((r) => r?.resultTypeID === 2);
  if (ft && ft.pointsTeam1 != null && ft.pointsTeam2 != null) {
    return `${ft.pointsTeam1}:${ft.pointsTeam2}`;
  }
  return null;
}

function scoreText(matchSkeleton, details) {
  const a = matchSkeleton?.score_team1;
  const b = matchSkeleton?.score_team2;
  if (a != null && b != null) return `${a}:${b}`;

  const fromDetails = pickFinalScoreFromDetails(details);
  if (fromDetails) return fromDetails;

  return "—";
}

export default function MatchDetailsModal({ isOpen, onClose, match }) {
  const matchId = match?.id;
  const league = match?.league_shortcut;
  const season = match?.league_season;

  const [tab, setTab] = useState("overview");

  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [teamsIndex, setTeamsIndex] = useState(new Map());
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState("");

  const [table, setTable] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTab("overview");
    setDetails(null);
    setDetailsError("");
    setTeamsIndex(new Map());
    setTeamsError("");
    setTable(null);
    setTableError("");
  }, [isOpen, matchId]);

  useEffect(() => {
    if (!isOpen || !matchId) return;

    const ac = new AbortController();
    setDetailsLoading(true);
    setDetailsError("");

    getMatchDetails(matchId, { signal: ac.signal })
      .then((data) => setDetails(data))
      .catch((e) => setDetailsError(e?.message || "Не удалось загрузить детали"))
      .finally(() => setDetailsLoading(false));

    return () => ac.abort();
  }, [isOpen, matchId]);

  useEffect(() => {
    if (!isOpen || !league || !season) return;

    const ac = new AbortController();
    setTeamsLoading(true);
    setTeamsError("");

    getAvailableTeams(league, season, { signal: ac.signal })
      .then((arr) => setTeamsIndex(buildTeamIconIndex(arr)))
      .catch((e) => setTeamsError(e?.message || "Не удалось загрузить команды"))
      .finally(() => setTeamsLoading(false));

    return () => ac.abort();
  }, [isOpen, league, season]);

  useEffect(() => {
    if (!isOpen || tab !== "table" || !league || !season) return;

    const ac = new AbortController();
    setTableLoading(true);
    setTableError("");

    getLeagueTable(league, season, { signal: ac.signal })
      .then((data) => setTable(data))
      .catch((e) => setTableError(e?.message || "Не удалось загрузить таблицу"))
      .finally(() => setTableLoading(false));

    return () => ac.abort();
  }, [isOpen, tab, league, season]);

  const headerInfo = useMemo(() => {
    const d = details || {};
    const t1 = d?.team1?.teamName || match?.team1_name || "Team 1";
    const t2 = d?.team2?.teamName || match?.team2_name || "Team 2";

    const status = match?.status || (d?.matchIsFinished ? "FINISHED" : "") || "—";

    const kickoff = match?.kickoff_utc || d?.matchDateTimeUTC || d?.matchDateTime || null;

    const groupName = d?.group?.groupName || d?.group?.groupOrderID || match?.group_order_id;

    const t1Id = d?.team1?.teamId ?? d?.team1?.teamID;
    const t2Id = d?.team2?.teamId ?? d?.team2?.teamID;

    const t1Icon = d?.team1?.teamIconUrl || (t1Id != null ? teamsIndex.get(String(t1Id)) : null);
    const t2Icon = d?.team2?.teamIconUrl || (t2Id != null ? teamsIndex.get(String(t2Id)) : null);

    return { t1, t2, t1Icon, t2Icon, status, kickoff, groupName };
  }, [details, match, teamsIndex]);

  const goals = useMemo(() => (Array.isArray(details?.goals) ? details.goals : []), [details]);
  const results = useMemo(() => (Array.isArray(details?.matchResults) ? details.matchResults : []), [details]);

  const overview = useMemo(() => {
    const loc = details?.location;
    const stadium = loc?.locationStadium || loc?.locationName || details?.locationName;
    const city = loc?.locationCity;
    const viewers = details?.numberOfViewers;
    const lastUpdate = details?.lastUpdateDateTime || details?.lastUpdateDateTimeUTC;
    return { stadium, city, viewers, lastUpdate };
  }, [details]);

  const matchTeamNamesLower = useMemo(() => {
    const a = String(match?.team1_name || headerInfo.t1 || "").toLowerCase();
    const b = String(match?.team2_name || headerInfo.t2 || "").toLowerCase();
    return { a, b };
  }, [match, headerInfo]);

  const devMode = Boolean(import.meta?.env?.DEV);

  return (
    <ModalShell isOpen={isOpen} onClose={onClose}>
      <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <TeamLogo url={headerInfo.t1Icon} name={headerInfo.t1} size={46} />
            <div style={{ fontWeight: 800, fontSize: 18 }}>{headerInfo.t1}</div>
            <div style={{ opacity: 0.8, fontWeight: 700 }}>{scoreText(match, details)}</div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{headerInfo.t2}</div>
            <TeamLogo url={headerInfo.t2Icon} name={headerInfo.t2} size={46} />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => safeCopyToClipboard(matchId)}
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
              }}
              title="Copy MatchID"
            >
              Copy MatchID
            </button>

            {devMode && (
              <button
                onClick={() => safeCopyToClipboard(JSON.stringify(details || {}, null, 2))}
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
                title="Copy JSON (dev-only)"
              >
                Copy JSON
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", opacity: 0.9 }}>
          <div>
            <b>League:</b> {league || "—"} / {season || "—"}
          </div>
          <div>
            <b>Round:</b> {headerInfo.groupName ?? "—"}
          </div>
          <div>
            <b>Status:</b> {headerInfo.status}
          </div>
          <div>
            <b>Kickoff:</b> {formatUtc(headerInfo.kickoff)}
          </div>
          <div>
            <b>MatchID:</b> {matchId ?? "—"}
          </div>
          {teamsLoading && <div style={{ opacity: 0.7 }}>Loading logos…</div>}
          {teamsError && <div style={{ color: "#ffb3b3" }}>{teamsError}</div>}
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
          Обзор
        </TabButton>
        <TabButton active={tab === "events"} onClick={() => setTab("events")} badge={goals.length || null}>
          События
        </TabButton>
        <TabButton active={tab === "results"} onClick={() => setTab("results")} badge={results.length || null}>
          Результаты
        </TabButton>
        <TabButton active={tab === "table"} onClick={() => setTab("table")}>
          Таблица
        </TabButton>
      </div>

      <div style={{ padding: 16, paddingTop: 0 }}>
        {detailsLoading && (
          <div style={{ opacity: 0.8, padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
            Загружаем детали матча…
          </div>
        )}

        {!!detailsError && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              background: "rgba(255,120,120,0.10)",
            }}
          >
            <div style={{ fontWeight: 800 }}>Не удалось загрузить детали</div>
            <div style={{ opacity: 0.9, marginTop: 6 }}>{detailsError}</div>
            <button
              onClick={() => {
                setDetailsLoading(true);
                setDetailsError("");
                getMatchDetails(matchId, { force: true })
                  .then(setDetails)
                  .catch((e) => setDetailsError(e?.message || "Не удалось загрузить детали"))
                  .finally(() => setDetailsLoading(false));
              }}
              style={{
                marginTop: 10,
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {tab === "overview" && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <Card title="Итоговый счёт">
              <div style={{ fontSize: 28, fontWeight: 900 }}>{scoreText(match, details)}</div>
            </Card>

            <Card title="Локация / зрители / lastUpdate">
              <Row label="Стадион" value={overview.stadium || "—"} />
              <Row label="Город" value={overview.city || "—"} />
              <Row label="Зрители" value={overview.viewers ?? "—"} />
              <Row label="Last update" value={overview.lastUpdate ? formatUtc(overview.lastUpdate) : "—"} />
            </Card>

            <Card title="Raw (скелет /api/board)">
              <Row label="Team1" value={match?.team1_name || "—"} />
              <Row label="Team2" value={match?.team2_name || "—"} />
              <Row label="Kickoff UTC" value={match?.kickoff_utc || "—"} />
              <Row label="Status" value={match?.status || "—"} />
            </Card>
          </div>
        )}

        {tab === "events" && (
          <div style={{ marginTop: 12 }}>
            <Card title="События (goals timeline)">
              {goals.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Нет событий или OpenLigaDB не вернул goals.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {goals
                    .slice()
                    .sort((a, b) => (a?.matchMinute ?? 0) - (b?.matchMinute ?? 0))
                    .map((g, idx) => {
                      const minute = g?.matchMinute ?? g?.MatchMinute ?? "—";
                      const scorer = g?.goalGetterName ?? g?.GoalGetterName ?? "—";
                      const score =
                        g?.scoreTeam1 != null && g?.scoreTeam2 != null ? `${g.scoreTeam1}:${g.scoreTeam2}` : "—";
                      const comment = g?.comment || g?.Comment;
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "rgba(255,255,255,0.04)",
                            display: "flex",
                            gap: 10,
                            alignItems: "baseline",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                            <div style={{ fontWeight: 900, width: 70 }}>{minute}'</div>
                            <div style={{ fontWeight: 800 }}>{scorer}</div>
                            {comment && <div style={{ opacity: 0.8 }}>({comment})</div>}
                          </div>
                          <div style={{ fontWeight: 900 }}>{score}</div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === "results" && (
          <div style={{ marginTop: 12 }}>
            <Card title="Результаты (matchResults)">
              {results.length === 0 ? (
                <div style={{ opacity: 0.8 }}>Нет matchResults.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {results
                    .slice()
                    .sort((a, b) => (a?.resultOrderID ?? 0) - (b?.resultOrderID ?? 0))
                    .map((r) => {
                      const key = String(r?.resultID ?? `${r?.resultTypeID}-${r?.resultOrderID}`);
                      const name = r?.resultName || "—";
                      const p1 = r?.pointsTeam1 ?? "—";
                      const p2 = r?.pointsTeam2 ?? "—";
                      const typeId = r?.resultTypeID;

                      // Обычно: typeId=1 HT, typeId=2 FT (зависит от лиги)
                      const highlight = typeId === 2;

                      return (
                        <div
                          key={key}
                          style={{
                            padding: 10,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: highlight ? "rgba(120,255,120,0.10)" : "rgba(255,255,255,0.04)",
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 900 }}>{name}</div>
                            <div style={{ opacity: 0.8, fontSize: 12 }}>
                              order={r?.resultOrderID ?? "—"} / typeId={typeId ?? "—"}
                            </div>
                          </div>
                          <div style={{ fontWeight: 900, fontSize: 18 }}>
                            {p1}:{p2}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === "table" && (
          <div style={{ marginTop: 12 }}>
            <Card title="Таблица (standings)">
              {tableLoading && <div style={{ opacity: 0.8 }}>Загружаем таблицу…</div>}
              {!!tableError && (
                <div style={{ color: "#ffb3b3" }}>
                  {tableError}{" "}
                  <button
                    onClick={() => {
                      setTableLoading(true);
                      setTableError("");
                      getLeagueTable(league, season, { force: true })
                        .then(setTable)
                        .catch((e) => setTableError(e?.message || "Не удалось загрузить таблицу"))
                        .finally(() => setTableLoading(false));
                    }}
                    style={{
                      marginLeft: 8,
                      background: "transparent",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 10,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!tableLoading && !tableError && Array.isArray(table) && (
                <div style={{ overflowX: "auto", marginTop: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ textAlign: "left", opacity: 0.9 }}>
                        <th style={{ padding: "8px 6px" }}>#</th>
                        <th style={{ padding: "8px 6px" }}>Team</th>
                        <th style={{ padding: "8px 6px" }}>Pts</th>
                        <th style={{ padding: "8px 6px" }}>P</th>
                        <th style={{ padding: "8px 6px" }}>W</th>
                        <th style={{ padding: "8px 6px" }}>D</th>
                        <th style={{ padding: "8px 6px" }}>L</th>
                        <th style={{ padding: "8px 6px" }}>GD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.map((row, idx) => {
                        const teamName = row?.teamName || row?.TeamName || "—";
                        const teamNameLower = String(teamName).toLowerCase();
                        const isMatchTeam =
                          teamNameLower.includes(matchTeamNamesLower.a) ||
                          teamNameLower.includes(matchTeamNamesLower.b) ||
                          matchTeamNamesLower.a.includes(teamNameLower) ||
                          matchTeamNamesLower.b.includes(teamNameLower);

                        return (
                          <tr
                            key={idx}
                            style={{
                              background: isMatchTeam ? "rgba(120,160,255,0.12)" : "transparent",
                              borderTop: "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            <td style={{ padding: "8px 6px" }}>{row?.rank ?? row?.Rank ?? idx + 1}</td>
                            <td style={{ padding: "8px 6px", fontWeight: isMatchTeam ? 900 : 600 }}>
                              {teamName}
                            </td>
                            <td style={{ padding: "8px 6px" }}>{row?.points ?? row?.Points ?? "—"}</td>
                            <td style={{ padding: "8px 6px" }}>{row?.matches ?? row?.Matches ?? "—"}</td>
                            <td style={{ padding: "8px 6px" }}>{row?.won ?? row?.Won ?? "—"}</td>
                            <td style={{ padding: "8px 6px" }}>{row?.draw ?? row?.Draw ?? "—"}</td>
                            <td style={{ padding: "8px 6px" }}>{row?.lost ?? row?.Lost ?? "—"}</td>
                            <td style={{ padding: "8px 6px" }}>{row?.goalDiff ?? row?.GoalDiff ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function Card({ title, children }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "space-between", padding: "6px 0" }}>
      <div style={{ opacity: 0.85 }}>{label}</div>
      <div style={{ fontWeight: 700, marginLeft: 16, textAlign: "right" }}>{String(value)}</div>
    </div>
  );
}
