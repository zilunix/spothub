# backend/app/db.py

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .settings import settings


class Base(DeclarativeBase):
    """Базовый класс для всех ORM-моделей."""
    pass


# Синхронный engine SQLAlchemy 2.x
engine = create_engine(
    settings.database_url,
    future=True,
    echo=False,  # можно временно включить True для отладки SQL
)

# Фабрика сессий
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def get_db():
    """
    Зависимость для FastAPI: выдаёт сессию БД и корректно её закрывает.

    Пример использования:
        @router.get("/items")
        def list_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
