// src/api.js

let API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

/**
 * Установить базовый URL API (если нужно переопределить вручную).
 */
export function setApiBase(base) {
  if (typeof base === "string" && base.trim()) {
    API_BASE = base.replace(/\/$/, "");
  }
}

/**
 * Базовый запрос к API.
 * path — строка вида "/board" или "/archive/leagues"
 * params — объект с query-параметрами
 */
export async function apiRequest(path, params = {}) {
  const url = new URL(API_BASE + path, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(String(key), String(value));
    }
  });

  const resp = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }

  return resp.json();
}

/* ==== Старые функции (если использовались) ==== */

export function fetchLeagues() {
  return apiRequest("/leagues");
}

export function fetchMatches(league, dateStr) {
  return apiRequest("/matches", { league, date_str: dateStr });
}

/* ==== Новый API для доски (board) ==== */

/**
 * Получить объект { live, upcoming, recent }
 * leagues: массив строк (["bl1", "bl2"]), опционально
 * season: номер сезона, опционально
 */
export function fetchBoard({ leagues, season } = {}) {
  const params = {};
  if (Array.isArray(leagues) && leagues.length > 0) {
    params.leagues = leagues.join(",");
  }
  if (season) {
    params.season = season;
  }
  return apiRequest("/board", params);
}

/* ==== API для архива ==== */

export function fetchArchiveLeagues() {
  return apiRequest("/archive/leagues");
}

export function fetchArchiveSeasons(league) {
  return apiRequest(`/archive/${encodeURIComponent(league)}/seasons`);
}

export function fetchArchiveGroups(league, season) {
  return apiRequest(
    `/archive/${encodeURIComponent(league)}/${encodeURIComponent(season)}/groups`
  );
}

export function fetchArchiveMatches(league, season, groupOrderId) {
  return apiRequest(
    `/archive/${encodeURIComponent(league)}/${encodeURIComponent(
      season
    )}/${encodeURIComponent(groupOrderId)}`
  );
}
