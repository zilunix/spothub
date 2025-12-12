import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

import { loadRuntimeConfig } from "./config.js";
import { setApiBase } from "./api.js";

async function bootstrap() {
  const config = await loadRuntimeConfig();

  // Переопределяем API base только если он задан в runtime config (k8s).
  // Локальный dev продолжит использовать VITE_API_URL из import.meta.env.
  if (config?.apiBase) {
    setApiBase(config.apiBase);
  }

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App config={config} />
    </React.StrictMode>
  );
}

bootstrap();