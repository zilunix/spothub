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

function toIntOrEmpty(v) {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return String(Math.trunc(n));
}

function clampInt(n, { min = 0, max = 365 } = {}) {
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  const i = Math.trunc(x);
  return Math.min(max, Math.max(min, i));
}

export function BoardFilters({
  valueLeagues,
  valueSeason,

  // optional (если вы используете дни диапазона на Board)
  valueDaysBack,
  valueDaysAhead,

  onChange,
  onReset,

  // опции для UI
  leagueOptions = [], // [{value,label}]
  seasonOptions = [], // [{value,label}]

  // optional UI flags
  showDaysRange = true,
}) {
  const [localLeagues, setLocalLeagues] = useState(valueLeagues || []);
  const [localSeason, setLocalSeason] = useState(valueSeason || "");

  // храню как строки (для controlled input)
  const [localDaysBack, setLocalDaysBack] = useState(toIntOrEmpty(valueDaysBack));
  const [localDaysAhead, setLocalDaysAhead] = useState(toIntOrEmpty(valueDaysAhead));

  useEffect(() => {
    setLocalLeagues(valueLeagues || []);
  }, [valueLeagues]);

  useEffect(() => {
    setLocalSeason(valueSeason || "");
  }, [valueSeason]);

  useEffect(() => {
    setLocalDaysBack(toIntOrEmpty(valueDaysBack));
  }, [valueDaysBack]);

  useEffect(() => {
    setLocalDaysAhead(toIntOrEmpty(valueDaysAhead));
  }, [valueDaysAhead]);

  const normalizedLeagueOptions = useMemo(() => {
    // поддерживаем передачу простых строк
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

    const daysBack = localDaysBack === "" ? undefined : clampInt(localDaysBack, { min: 0, max: 365 });
    const daysAhead = localDaysAhead === "" ? undefined : clampInt(localDaysAhead, { min: 0, max: 365 });

    onChange?.({
      leagues: localLeagues,
      season: localSeason || undefined,
      // не навязываем — отдаём только если включено/задано
      ...(showDaysRange ? { daysBack, daysAhead } : {}),
    });
  };

  const handleLeaguesSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setLocalLeagues(selected);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* структура как в ArchivePage: controls/control */}
      <section className="controls">
        <div className="control">
          <label>Лиги</label>
          <select
            multiple
            value={localLeagues}
            onChange={handleLeaguesSelect}
            size={Math.min(6, Math.max(2, normalizedLeagueOptions.length))}
          >
            {normalizedLeagueOptions.length === 0 ? (
              <option value="" disabled>
                Нет доступных лиг
              </option>
            ) : (
              normalizedLeagueOptions.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label ?? l.value}
                </option>
              ))
            )}
          </select>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
            Выбрано: {localLeagues.length || 0}
          </div>
        </div>

        <div className="control">
          <label>Сезон</label>
          <select value={localSeason} onChange={(e) => setLocalSeason(e.target.value)}>
            <option value="">По умолчанию</option>
            {normalizedSeasonOptions.map((s) => (
              <option key={String(s.value)} value={String(s.value)}>
                {s.label ?? String(s.value)}
              </option>
            ))}
          </select>
        </div>

        {showDaysRange && (
          <>
            <div className="control">
              <label>Дней назад</label>
              <input
                type="number"
                min={0}
                max={365}
                step={1}
                value={localDaysBack}
                onChange={(e) => setLocalDaysBack(e.target.value)}
                placeholder="например 7"
              />
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                0–365 (пусто = по умолчанию)
              </div>
            </div>

            <div className="control">
              <label>Дней вперёд</label>
              <input
                type="number"
                min={0}
                max={365}
                step={1}
                value={localDaysAhead}
                onChange={(e) => setLocalDaysAhead(e.target.value)}
                placeholder="например 7"
              />
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                0–365 (пусто = по умолчанию)
              </div>
            </div>
          </>
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
