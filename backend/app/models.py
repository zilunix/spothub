from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# <-- наше:
from app.models import Base
from app.db import engine as app_engine  # engine уже настроен на DATABASE_URL

# это стандартный импорт логгера
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# наша metadata
target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    # В offline можно вытащить URL из env при желании
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        import os
        url = os.environ.get("DATABASE_URL")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    # вместо engine_from_config используем наш app_engine
    connectable = app_engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
