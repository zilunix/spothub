import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchBoard } from "../api";
import BoardHeader from "../components/BoardHeader";
import { LiveMatchesSection } from "../components/LiveMatchesSection";
import { UpcomingMatchesSection } from "../components/UpcomingMatchesSection";
import { RecentMatchesSection } from "../components/RecentMatchesSection";
import MatchDetailsModal from "../components/MatchDetailsModal";

const DEFAULT_REFRESH_SECONDS = 30;

// Оперативное окно для live/upcoming
const MAIN_DAYS_BACK = 1;
const MAIN_DAYS_AHEAD = 2;

// Recent: сколько туров показываем на одной странице
const RECENT_ROUNDS_PER_PAGE = 3;

// Recent: сколько дней истории тянуть
// (поставил 365; если бэк отдаст 400 — сделаем fallback на 240)
const RECENT_HISTORY_DAYS_PRIMARY = 365;
const RECENT_HISTORY_DAYS_FALLBACK = 240;

function normalizeDefaultLeagues(defaultLeagues) {
  if (Array.isArray(defaultLeagues) && defaultLeagues.length > 0) {
    return defaultLeagues.map((x) => String(x).trim()).filter(Boolean);
  }
  return ["bl1"];
}

function uniq(arr) {
  return Array.from(
    new Set(
      (Array.isArray(arr) ? arr : []).map((x) => String(x).trim()).filter(Boolean)
    )
  );
}

function byKickoffDesc(a, b) {
  const da = a?.kickoff_utc ? Date.parse(a.kickoff_utc) : 0;
  const db = b?.kickoff_utc ? Date.parse(b.kickoff_utc) : 0;
  return db - da;
}

function formatDateRangeFromMatches(matches) {
  if (!matches || matches.length === 0) return "—";
  const times = matches
    .map((m) => (m?.kickoff_utc ? Date.parse(m.kickoff_utc) : null))
    .filter((x) => Number.isFinite(x));
  if (times.length === 0) return "—";
  const min = new Date(Math.min(...times));
  const max = new Date(Math.max(...times));
  const fmt = (d) =>
    d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  return `${fmt(min)} — ${fmt(max)}`;
}

export function BoardPage({ defaultLeagues, defaultSeason, refreshSeconds }) {
  const initialLeagues = useMemo(
    () => normalizeDefaultLeagues(defaultLeagues),
    [defaultLeagues]
  );

  const [selectedLeagues, setSelectedLeagues] = useState(() => initialLeagues);

  // сезон фиксируем для доски
  const season = useMemo(() => {
    const n = Number(defaultSeason);
    if (Number.isFinite(n) && n > 2000) return n;
    return new Date().getFullYear();
  }, [defaultSeason]);

  // main
  const [mainMeta, setMainMeta] = useState({ date_from: null, date_to: null, leagues: [] });
  const [live, setLive] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  // recent history + pagination by rounds
  const [recentHistory, setRecentHistory] = useState([]);
  const [recentRounds, setRecentRounds] = useState([]);
  const [recentPageIndex, setRecentPageIndex] = useState(0);

  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [error, setError] = useState(null);

  // modal
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const intervalRef = useRef(null);

  const leagueOptions = useMemo(() => {
    const base = ["bl1", "bl2"];
    const extra = normalizeDefaultLeagues(defaultLeagues);
    const merged = uniq([...base, ...extra]);
    return merged.map((x) => ({ value: x, label: x.toUpperCase() }));
  }, [defaultLeagues]);

  const allLeagues = useMemo(() => leagueOptions.map((x) => x.value), [leagueOptions]);

  const refreshMs = Math.max(0, Number(refreshSeconds ?? DEFAULT_REFRESH_SECONDS)) * 1000;

  const loadMain = async ({ showLoader = false } = {}) => {
    if (showLoader) setLoadingMain(true);
    try {
      setError(null);
      const data = await fetchBoard({
        leagues: selectedLeagues,
        season,
        daysBack: MAIN_DAYS_BACK,
        daysAhead: MAIN_DAYS_AHEAD,
      });

      setMainMeta({
        date_from: data.date_from || null,
        date_to: data.date_to || null,
        leagues: data.leagues || [],
      });
      setLive(data.live || []);
      setUpcoming(data.upcoming || []);
    } catch (e) {
      console.error("Failed to fetch main board:", e);
      setError(e?.message || "Ошибка загрузки данных.");
    } finally {
      if (showLoader) setLoadingMain(false);
    }
  };

  const loadRecentHistory = async ({ showLoader = false } = {}) => {
    if (showLoader) setLoadingRecent(true);
    try {
      setError(null);

      const attempt = async (daysBack) => {
        return fetchBoard({
          leagues: selectedLeagues,
          season,
          daysBack,
          daysAhead: 0,
        });
      };

      let data;
      try {
        data = await attempt(RECENT_HISTORY_DAYS_PRIMARY);
      } catch (e) {
        data = await attempt(RECENT_HISTORY_DAYS_FALLBACK);
      }

      const list = Array.isArray(data.recent) ? [...data.recent].sort(byKickoffDesc) : [];
      setRecentHistory(list);

      const roundsSet = new Set();
      for (const m of list) {
        if (m?.group_order_id != null) roundsSet.add(Number(m.group_order_id));
      }
      const rounds = Array.from(roundsSet)
        .filter((x) => Number.isFinite(x))
        .sort((a, b) => b - a);

      setRecentRounds(rounds);
    } catch (e) {
      console.error("Failed to fetch recent history:", e);
      setError(e?.message || "Ошибка загрузки recent.");
    } finally {
      if (showLoader) setLoadingRecent(false);
    }
  };

  useEffect(() => {
    setRecentPageIndex(0);

    (async () => {
      await Promise.all([loadMain({ showLoader: true }), loadRecentHistory({ showLoader: true })]);
    })();

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshMs > 0) {
      intervalRef.current = setInterval(() => {
        loadMain({ showLoader: false });
      }, refreshMs);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeagues, season, refreshMs]);

  const handleMatchClick = (match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMatch(null);
  };

  const currentRoundIds = useMemo(() => {
    const start = recentPageIndex * RECENT_ROUNDS_PER_PAGE;
    const end = start + RECENT_ROUNDS_PER_PAGE;
    return recentRounds.slice(start, end);
  }, [recentRounds, recentPageIndex]);

  const recentGroups = useMemo(() => {
    if (!currentRoundIds.length) return [];
    const idsSet = new Set(currentRoundIds);

    const grouped = new Map();
    for (const r of currentRoundIds) grouped.set(r, []);

    for (const m of recentHistory) {
      const r = Number(m?.group_order_id);
      if (!idsSet.has(r)) continue;
      grouped.get(r).push(m);
    }

    return currentRoundIds.map((r) => ({
      round: r,
      matches: grouped.get(r).sort(byKickoffDesc),
    }));
  }, [recentHistory, currentRoundIds]);

  const flattenedRecentPageMatches = useMemo(
    () => recentGroups.flatMap((g) => g.matches),
    [recentGroups]
  );

  const recentRangeText = useMemo(
    () => formatDateRangeFromMatches(flattenedRecentPageMatches),
    [flattenedRecentPageMatches]
  );

  const hasNewer = recentPageIndex > 0;
  const hasOlder = (recentPageIndex + 1) * RECENT_ROUNDS_PER_PAGE < recentRounds.length;

  const isEmpty =
    !loadingMain &&
    !loadingRecent &&
    !error &&
    (live?.length ?? 0) === 0 &&
    (upcoming?.length ?? 0) === 0 &&
    flattenedRecentPageMatches.length === 0;

  return (
    <div className="board-page">
      <BoardHeader
        leaguesAll={allLeagues}
        selectedLeagues={selectedLeagues}
        onSelectedLeaguesChange={(leagues) => {
          const fallback = normalizeDefaultLeagues(defaultLeagues);
          setSelectedLeagues(Array.isArray(leagues) && leagues.length > 0 ? leagues : fallback);
        }}
        seasonValue=""
        seasons={[]}
        onSeasonChange={() => {}}
        onApply={() => {
          loadMain({ showLoader: true });
          loadRecentHistory({ showLoader: true });
        }}
        onReset={() => {
          setSelectedLeagues(initialLeagues);
        }}
        stats={{
          season: String(season),
          windowText: `${MAIN_DAYS_BACK} назад / ${MAIN_DAYS_AHEAD} вперёд`,
          rangeText:
            mainMeta.date_from && mainMeta.date_to
              ? `${mainMeta.date_from} — ${mainMeta.date_to}`
              : "—",
          leaguesFromApiText:
            Array.isArray(mainMeta.leagues) && mainMeta.leagues.length > 0
              ? mainMeta.leagues.join(", ")
              : "—",
        }}
      />

      {(loadingMain || loadingRecent) && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>Ошибка: {error}</p>}

      {isEmpty && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
            Матчей не найдено. Попробуйте выбрать другие лиги или нажмите “Старее →” в блоке Recent,
            если история не попала в первые туры.
          </p>
        </div>
      )}

      <LiveMatchesSection matches={live} onMatchClick={handleMatchClick} />
      <UpcomingMatchesSection matches={upcoming} onMatchClick={handleMatchClick} />

      <RecentMatchesSection
        groups={recentGroups}
        onMatchClick={handleMatchClick}
        pageSizeRounds={RECENT_ROUNDS_PER_PAGE}
        rangeText={recentRangeText}
        isLoading={loadingRecent}
        hasNewer={hasNewer}
        hasOlder={hasOlder}
        onNewer={() => setRecentPageIndex((p) => Math.max(0, p - 1))}
        onOlder={() => setRecentPageIndex((p) => (hasOlder ? p + 1 : p))}
      />

      <MatchDetailsModal isOpen={isModalOpen} onClose={closeModal} match={selectedMatch} />
    </div>
  );
}

export default BoardPage;
