// src/App.jsx
import React from "react";
import { BoardPage } from "./pages/BoardPage";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>SportHub</h1>
        <p className="subtitle">
          MVP-панель матчей (Kubernetes домашняя лаба)
        </p>
      </header>

      <main className="content">
        <BoardPage />
      </main>

      <footer className="footer">
        <span>SportHub MVP · Kubernetes homelab</span>
      </footer>
    </div>
  );
}

