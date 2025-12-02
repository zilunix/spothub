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

  // 1) если backend вернул сразу массив
  if (Array.isArray(data)) {
    return data;
  }

  // 2) если backend вернул объект вида { leagues: [...] }
  if (data && Array.isArray(data.leagues)) {
    return data.leagues;
  }

  // 3) заглушка на случай любого другого ответа, чтобы .map не падал
  return [];
}

export function fetchMatches(league, dateStr) {
  return request("/matches", { league, date_str: dateStr });
}
