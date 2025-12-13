// src/services/openLigaClient.js

const OPENLIGA_BASE = "https://api.openligadb.de";

// In-memory caches (на время жизни страницы)
const matchDetailsCache = new Map(); // key: matchId -> { data, ts }
const teamsCache = new Map();        // key: `${league}:${season}` -> { data, ts }
const tableCache = new Map();        // key: `${league}:${season}` -> { data, ts }

// чтобы не дергать API слишком часто при кликах туда-сюда
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 минут

function cacheGet(map, key, ttlMs = DEFAULT_TTL_MS) {
  const item = map.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > ttlMs) return null;
  return item.data;
}

function cacheSet(map, key, data) {
  map.set(key, { data, ts: Date.now() });
}

async function fetchJson(url, { signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenLigaDB HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * Match details by matchId
 * GET https://api.openligadb.de/getmatchdata/{matchId}
 */
export async function getMatchDetails(matchId, { force = false, signal } = {}) {
  const key = String(matchId);
  if (!force) {
    const cached = cacheGet(matchDetailsCache, key);
    if (cached) return cached;
  }
  const data = await fetchJson(`${OPENLIGA_BASE}/getmatchdata/${encodeURIComponent(key)}`, { signal });
  cacheSet(matchDetailsCache, key, data);
  return data;
}

/**
 * Teams for league+season (для teamIconUrl)
 * GET https://api.openligadb.de/getavailableteams/{leagueShortcut}/{leagueSeason}
 */
export async function getAvailableTeams(leagueShortcut, leagueSeason, { force = false, signal } = {}) {
  const key = `${leagueShortcut}:${leagueSeason}`;
  if (!force) {
    const cached = cacheGet(teamsCache, key);
    if (cached) return cached;
  }
  const data = await fetchJson(
    `${OPENLIGA_BASE}/getavailableteams/${encodeURIComponent(leagueShortcut)}/${encodeURIComponent(leagueSeason)}`,
    { signal }
  );
  cacheSet(teamsCache, key, data);
  return data;
}

/**
 * Standings table for league+season
 * GET https://api.openligadb.de/getbltable/{leagueShortcut}/{leagueSeason}
 */
export async function getLeagueTable(leagueShortcut, leagueSeason, { force = false, signal } = {}) {
  const key = `${leagueShortcut}:${leagueSeason}`;
  if (!force) {
    const cached = cacheGet(tableCache, key);
    if (cached) return cached;
  }
  const data = await fetchJson(
    `${OPENLIGA_BASE}/getbltable/${encodeURIComponent(leagueShortcut)}/${encodeURIComponent(leagueSeason)}`,
    { signal }
  );
  cacheSet(tableCache, key, data);
  return data;
}

// Helpers

export function buildTeamIconIndex(teamsArray) {
  // Возвращаем Map(teamId -> teamIconUrl)
  const m = new Map();
  if (!Array.isArray(teamsArray)) return m;

  for (const t of teamsArray) {
    // В OpenLigaDB обычно: teamId, teamName, teamIconUrl
    const id = t?.teamId ?? t?.TeamId ?? t?.teamID;
    const icon = t?.teamIconUrl ?? t?.TeamIconUrl ?? t?.teamIconURL;
    if (id != null && icon) m.set(String(id), String(icon));
  }
  return m;
}

export function safeCopyToClipboard(text) {
  const value = String(text ?? "");
  if (!value) return Promise.resolve(false);

  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(value).then(() => true).catch(() => false);
  }

  // fallback
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.left = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return Promise.resolve(ok);
  } catch {
    return Promise.resolve(false);
  }
}
