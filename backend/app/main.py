from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .sports_api import router as sports_router

app = FastAPI(
    title="SportHub API",
    version="0.1.0",
    description="Простой API для отображения спортивных лиг и матчей (через OpenLigaDB).",
)

# CORS — чтобы фронт из браузера мог ходить к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", summary="Проверка живости")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {"message": "SportHub API. См. /docs"}


# Подключаем наш router из sports_api,
# в нём уже есть /api/leagues и /api/matches
app.include_router(sports_router)
