let API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "/api";

export function setApiBase(base) {
  if (typeof base === "string" && base.trim()) {
    API_BASE = base.replace(/\/$/, "");
  }
}

async function request(path, params = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const resp = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }

  return resp.json();
}

export async function fetchLeagues() {
  const data = await request("/leagues");
  console.log("fetchLeagues raw:", data, "isArray:", Array.isArray(data));

  // 1) backend вернул сразу массив
  if (Array.isArray(data)) {
    return data;
  }

  // 2) backend вернул объект вида { leagues: [...] }
  if (data && Array.isArray(data.leagues)) {
    return data.leagues;
  }

  // 3) заглушка на случай любого другого ответа, чтобы .map не падал
  return [];
}

export async function fetchMatches(league, dateStr) {
  const data = await request("/matches", { league, date_str: dateStr });
  console.log("fetchMatches raw:", data, "isArray:", Array.isArray(data));

  // 1) backend вернул сразу массив матчей
  if (Array.isArray(data)) {
    return data;
  }

  // 2) backend вернул объект вида { matches: [...] }
  if (data && Array.isArray(data.matches)) {
    return data.matches;
  }

  // 3) заглушка
  return [];
}
