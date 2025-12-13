// src/components/BoardFilters.jsx
import React, { useEffect, useMemo, useState } from "react";

function uniqStrings(arr) {
  const out = [];
  const seen = new Set();
  for (const x of Array.isArray(arr) ? arr : []) {
    const s = String(x || "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function BoardFilters({
  valueLeagues,
  valueSeason,
  onChange,
  onReset,

  leagueOptions = [], // [{value,label}]
  seasonOptions = [], // [{value,label}]

  showSeason = true,
}) {
  const [localLeagues, setLocalLeagues] = useState(valueLeagues || []);
  const [localSeason, setLocalSeason] = useState(valueSeason || "");

  useEffect(() => {
    setLocalLeagues(valueLeagues || []);
  }, [valueLeagues]);

  useEffect(() => {
    setLocalSeason(valueSeason || "");
  }, [valueSeason]);

  const normalizedLeagueOptions = useMemo(() => {
    const base =
      leagueOptions.length > 0
        ? leagueOptions
        : uniqStrings(valueLeagues).map((x) => ({ value: x, label: x }));
    return base.filter((x) => x?.value);
  }, [leagueOptions, valueLeagues]);

  const normalizedSeasonOptions = useMemo(() => {
    const base = seasonOptions.length > 0 ? seasonOptions : [];
    return base.filter((x) => x?.value !== undefined && x?.value !== null);
  }, [seasonOptions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onChange?.({
      leagues: localLeagues,
      season: showSeason ? (localSeason || undefined) : undefined,
    });
  };

  const toggleLeague = (leagueValue) => {
    const v = String(leagueValue || "").trim();
    if (!v) return;

    setLocalLeagues((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      if (current.includes(v)) return current.filter((x) => x !== v);
      return [...current, v];
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <section className="controls">
        <div className="control">
          <label>Лиги</label>

          {normalizedLeagueOptions.length === 0 ? (
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
              Нет доступных лиг
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                marginTop: 6,
              }}
            >
              {normalizedLeagueOptions.map((l) => {
                const val = String(l.value);
                const checked = (localLeagues || []).includes(val);

                return (
                  <label
                    key={val}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLeague(val)}
                    />
                    <span>{l.label ?? val}</span>
                  </label>
                );
              })}
            </div>
          )}

          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Выбрано: {localLeagues.length || 0}
          </div>
        </div>

        {showSeason && (
          <div className="control">
            <label>Сезон</label>
            <select
              value={localSeason}
              onChange={(e) => setLocalSeason(e.target.value)}
            >
              <option value="">По умолчанию</option>
              {normalizedSeasonOptions.map((s) => (
                <option key={String(s.value)} value={String(s.value)}>
                  {s.label ?? String(s.value)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="control" style={{ alignSelf: "end" }}>
          <label style={{ opacity: 0 }}>Действия</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit">Применить</button>
            <button type="button" onClick={onReset}>
              Сбросить
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
