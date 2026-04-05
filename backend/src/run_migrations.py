from __future__ import annotations

import asyncio
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine


async def _should_bootstrap_with_stamp(database_url: str) -> bool:
    engine = create_async_engine(database_url)
    try:
        async with engine.connect() as connection:
            def _check_tables(sync_connection) -> bool:
                inspector = inspect(sync_connection)
                has_gists = inspector.has_table("gists")
                has_alembic_version = inspector.has_table("alembic_version")
                return has_gists and not has_alembic_version

            return await connection.run_sync(_check_tables)
    finally:
        await engine.dispose()


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    config = Config(str(backend_root / "alembic.ini"))

    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        config.set_main_option("sqlalchemy.url", database_url)

        if asyncio.run(_should_bootstrap_with_stamp(database_url)):
            command.stamp(config, "head")
            return

    command.upgrade(config, "head")


if __name__ == "__main__":
    main()
