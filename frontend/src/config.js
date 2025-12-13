
// src/config.js

const DEFAULT_CONFIG = {
  apiBase: "/api",
  defaultLeagues: ["bl1"],

  // Пустая строка = season не отправляем, backend использует SPORTS_DEFAULT_SEASON.
  defaultSeason: "",

  // Окно доски (days_back / days_ahead)
  defaultDaysBack: 7,
  defaultDaysAhead: 7,

  // Частота автообновления доски
  refreshSeconds: 30,
};

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function normalizeRuntimeConfig(cfg) {
  const obj = cfg && typeof cfg === "object" ? cfg : {};

  // Backward compatibility: поддерживаем старые имена ключей.
  const defaultDaysBack =
    obj.defaultDaysBack ?? (obj.daysBack !== undefined ? obj.daysBack : undefined);
  const defaultDaysAhead =
    obj.defaultDaysAhead ??
    (obj.daysAhead !== undefined ? obj.daysAhead : undefined);

  // Возможный старый формат: refreshIntervalMs
  const refreshSeconds =
    obj.refreshSeconds ??
    (obj.refreshIntervalMs !== undefined
      ? Math.round(toInt(obj.refreshIntervalMs, 30_000) / 1000)
      : undefined);

  return {
    ...obj,
    defaultDaysBack,
    defaultDaysAhead,
    refreshSeconds,
  };
}

export async function loadRuntimeConfig() {
  try {
    const resp = await fetch("/config.json", { cache: "no-store" });
    if (!resp.ok) return DEFAULT_CONFIG;

    const cfg = await resp.json();
    return {
      ...DEFAULT_CONFIG,
      ...normalizeRuntimeConfig(cfg),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
