import React, { useEffect, useMemo, useRef, useState } from "react";
import "./BoardHeader.css";

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

function LeagueMultiSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  useOnClickOutside(wrapRef, () => setOpen(false));

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((x) => x.toLowerCase().includes(qq));
  }, [options, q]);

  const toggle = (val) => {
    if (selectedSet.has(val)) onChange(selected.filter((x) => x !== val));
    else onChange([...selected, val]);
  };

  const clear = () => onChange([]);

  return (
    <div className="bh-field" ref={wrapRef}>
      <div className="bh-label">Лиги</div>

      <button
        type="button"
        className="bh-ms-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="bh-ms-trigger-left">
          <div className="bh-ms-title">
            {selected.length ? `Выбрано: ${selected.length}` : "Выберите лиги"}
          </div>

          <div className="bh-ms-chips">
            {selected.slice(0, 3).map((x) => (
              <span key={x} className="bh-chip">
                {String(x).toUpperCase()}
              </span>
            ))}
            {selected.length > 3 && (
              <span className="bh-chip bh-chip-muted">
                +{selected.length - 3}
              </span>
            )}
          </div>
        </div>

        <span className="bh-ms-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="bh-ms-popover">
          <div className="bh-ms-search">
            <div className="bh-search-left">
              <span className="bh-search-ico" aria-hidden="true">
                ⌕
              </span>
              <input
                className="bh-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск (bl1, bl2...)"
              />
            </div>

            <button type="button" className="bh-link" onClick={clear}>
              Очистить
            </button>
          </div>

          <div className="bh-ms-list" role="listbox" aria-multiselectable="true">
            {filtered.map((opt) => {
              const checked = selectedSet.has(opt);
              return (
                <label key={opt} className="bh-ms-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt)}
                  />
                  <span className="bh-ms-item-text">
                    {String(opt).toUpperCase()}
                  </span>
                  <span className="bh-ms-check" aria-hidden="true">
                    {checked ? "✓" : ""}
                  </span>
                </label>
              );
            })}

            {!filtered.length && <div className="bh-ms-empty">Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardHeader({
  title = "Спортивная доска",
  subtitle = "Фильтры и актуальная выборка матчей по лигам/сезонам",

  leaguesAll = [],
  selectedLeagues = [],
  onSelectedLeaguesChange,

  seasonValue = "", // "" = По умолчанию
  seasons = [],
  onSeasonChange,

  onApply,
  onReset,

  stats = {
    season: "—",
    windowText: "—",
    rangeText: "—",
    leaguesFromApiText: "—",
  },
}) {
  return (
    <section className="bh-wrap">
      <div className="bh-hero">
        <div className="bh-title">
          <div className="bh-h1">{title}</div>
          <div className="bh-sub">{subtitle}</div>
        </div>

        <div className="bh-card">
          <div className="bh-card-head">
            <div className="bh-card-head-title">Лиги</div>
            <div className="bh-kebab" title="Меню (позже)">
              ••
            </div>
          </div>

          <div className="bh-grid">
            <LeagueMultiSelect
              options={leaguesAll}
              selected={selectedLeagues}
              onChange={onSelectedLeaguesChange}
            />

            <div className="bh-field">
              <div className="bh-label">Сезон</div>
              <select
                className="bh-select"
                value={seasonValue ?? ""}
                onChange={(e) => onSeasonChange?.(e.target.value)}
              >
                <option value="">По умолчанию</option>
                {seasons.map((s) => (
                  <option key={String(s)} value={String(s)}>
                    {String(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className="bh-actions">
              <button type="button" className="bh-btn bh-btn-primary" onClick={onApply}>
                Применить
              </button>
              <button type="button" className="bh-btn bh-btn-ghost" onClick={onReset}>
                Сбросить
              </button>
            </div>
          </div>

          <div className="bh-stats">
            <div className="bh-stat">
              <div className="bh-stat-k">Сезон</div>
              <div className="bh-stat-v">{stats.season}</div>
            </div>

            <div className="bh-stat">
              <div className="bh-stat-k">Live/Upcoming окно</div>
              <div className="bh-stat-v">{stats.windowText}</div>
            </div>

            <div className="bh-stat">
              <div className="bh-stat-k">Live/Upcoming диапазон</div>
              <div className="bh-stat-v">{stats.rangeText}</div>
            </div>

            <div className="bh-stat">
              <div className="bh-stat-k">Лиги (факт из API)</div>
              <div className="bh-stat-v">{stats.leaguesFromApiText}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
