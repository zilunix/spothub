import React, { useEffect, useState } from "react";
import { fetchLeagues, fetchMatches } from "./api.js";

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return formatDateInput(new Date());
}

export default function App() {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [dateStr, setDateStr] = useState(todayIso());
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLeagues();
        setLeagues(data);
        if (data.length > 0) {
          setSelectedLeague(data[0].id);
        }
      } catch (e) {
        setError(`Ошибка загрузки лиг: ${e.message}`);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;

    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await fetchMatches(selectedLeague, dateStr);
        setMatches(data);
      } catch (e) {
        setError(`Ошибка загрузки матчей: ${e.message}`);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedLeague, dateStr]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>SportHub</h1>
        <p className="subtitle">MVP-панель матчей (Kubernetes домашняя лаба)</p>
      </header>

      <section className="controls">
        <div className="control">
          <label>Лига</label>
          <select
            value={selectedLeague}
            onChange={(e) => setSelectedLeague(e.target.value)}
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control">
          <label>Дата</label>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
          />
        </div>
      </section>

      <section className="content">
        {loading && <div className="info">Загружаем матчи...</div>}
        {error && <div className="error">{error}</div>}

        {!loading && !error && matches.length === 0 && (
          <div className="info">Нет матчей для выбранной лиги и даты.</div>
        )}

        {!loading && !error && matches.length > 0 && (
          <table className="matches-table">
            <thead>
              <tr>
                <th>Лига</th>
                <th>Матч</th>
                <th>Время</th>
                <th>Статус</th>
                <th>Счёт</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td>{selectedLeague.toUpperCase()}</td>
                  <td>
                    {m.home_team} vs {m.away_team}
                  </td>
                  <td>{m.start_time}</td>
                  <td>{m.status}</td>
                  <td>
                    {m.score_home == null || m.score_away == null
                      ? "-"
                      : `${m.score_home}:${m.score_away}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="footer">
        <span>SportHub MVP · Kubernetes homelab</span>
      </footer>
    </div>
  );
}
