
// src/config.js

const DEFAULT_CONFIG = {
  apiBase: "/api",
  defaultLeagues: ["bl1"],
};

export async function loadRuntimeConfig() {
  try {
    const resp = await fetch("/config.json", { cache: "no-store" });
    if (!resp.ok) return DEFAULT_CONFIG;

    const cfg = await resp.json();
    return {
      ...DEFAULT_CONFIG,
      ...(cfg && typeof cfg === "object" ? cfg : {}),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
