# 05. Код приложения SportHub (MVP)

Здесь описано, как устроен код backend и frontend в этом репозитории.

## 1. Backend (FastAPI)

Расположение: `backend/`

Основные файлы:

- `backend/app/main.py` — входная точка FastAPI.
- `backend/app/config.py` — чтение настроек из переменных окружения.
- `backend/app/sports_api.py` — слой общения с внешним спортивным API (пока содержит заглушки).
- `backend/requirements.txt` — зависимости.
- `backend/Dockerfile` — сборка контейнера.

### 1.1 Основные endpoint'ы

- `GET /health` — проверка живости.
- `GET /leagues` — список лиг (заглушка).
- `GET /matches` — список матчей по лиге и дате.
  - query-параметры:
    - `league: str`
    - `date_str: str` (формат YYYY-MM-DD)
- `GET /teams` — список команд лиги.

Пока данные берутся из памяти (статические заглушки), но структура уже рассчитана на то, чтобы подключить реальный API внутри `sports_api.py`.

## 2. Frontend (React + Vite)

Расположение: `frontend/`

Основные файлы:

- `frontend/package.json` — зависимости и скрипты (`npm run dev`, `npm run build`).
- `frontend/vite.config.js` — конфиг Vite.
- `frontend/index.html` — HTML-шаблон.
- `frontend/src/main.jsx` — входная точка React.
- `frontend/src/App.jsx` — основной компонент.
- `frontend/src/api.js` — общий клиент для обращения к backend (учитывает `VITE_API_URL`).
- `frontend/src/styles.css` — простые стили.

Основные страницы/виджеты:

- Панель (dashboard) с:
  - селектором лиги,
  - списком матчей на выбранную дату.
- Таблица матчей:
  - команда1 vs команда2,
  - время,
  - счёт (если есть).

Для работы во фронте используется API:

- `GET {API_BASE}/leagues`
- `GET {API_BASE}/matches?league=...&date_str=...`

Где `API_BASE` берётся из:

- `import.meta.env.VITE_API_URL` (во время билда),
- если переменная не задана — используется относительный путь `/api`.

## 3. Как запускать локально (без Docker)

### 3.1 Backend локально

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Проверка:

- `http://localhost:8000/health`
- `http://localhost:8000/docs`

### 3.2 Frontend локально

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Если backend запущен локально на `http://localhost:8000`, то можно создать `.env.local` в `frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

Тогда фронт будет ходить ровно туда.

Для варианта Kubernetes мы будем использовать ингресс и относительный путь `/api`, поэтому `VITE_API_URL` можно не задавать, а настроить роутинг через Ingress.

Далее смотри `06_sporthub_docker_and_push.md` — там все шаги по сборке Docker-образов и отправке их в registry.
