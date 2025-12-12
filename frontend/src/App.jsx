// src/App.jsx
import React, { useState } from "react";
import { BoardPage } from "./pages/BoardPage";
import { ArchivePage } from "./pages/ArchivePage";

export default function App({ config }) {
  const [activeTab, setActiveTab] = useState("board"); // "board" | "archive"
  const defaultLeagues = config?.defaultLeagues;

  return (
    <div className="app">
      <header className="app-header">
        <h1>SportHub</h1>
        <p className="subtitle">MVP-панель матчей (Kubernetes домашняя лаба)</p>

        <nav className="tabs">
          <button
            type="button"
            className={activeTab === "board" ? "tab active" : "tab"}
            onClick={() => setActiveTab("board")}
          >
            Доска
          </button>
          <button
            type="button"
            className={activeTab === "archive" ? "tab active" : "tab"}
            onClick={() => setActiveTab("archive")}
          >
            Архив
          </button>
        </nav>
      </header>

      <main className="content">
        {activeTab === "board" ? (
          <BoardPage defaultLeagues={defaultLeagues} />
        ) : (
          <ArchivePage />
        )}
      </main>

      <footer className="footer">
        <span>SportHub MVP · Kubernetes homelab</span>
      </footer>
    </div>
  );
}
