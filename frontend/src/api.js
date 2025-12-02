const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

async function request(path, params = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const resp = await fetch(url, {
    headers: {
      "Accept": "application/json"
    }
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${text}`);
  }

  return resp.json();
}

export function fetchLeagues() {
  return request("/leagues");
}

export function fetchMatches(league, dateStr) {
  return request("/matches", { league, date_str: dateStr });
}
