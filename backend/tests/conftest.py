import pytest
from unittest.mock import MagicMock, patch
from typing import AsyncGenerator
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from alembic import command
from alembic.config import Config
from src.main import app
from src.db import DATABASE_URL
from src.dependencies import get_db


BACKEND_ROOT = Path(__file__).resolve().parents[1]


def reset_database() -> None:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", DATABASE_URL)
    command.upgrade(config, "head")

# Mock Storage


class MockStorage:
    def __init__(self):
        self.store = {}

    def generate_presigned_post(self, key: str, max_size_bytes: int = 10485760) -> dict | None:
        return {
            "url": "https://s3.amazonaws.com/bucket",
            "fields": {"key": key, "AWSAccessKeyId": "test", "policy": "test", "signature": "test"}
        }

    def generate_presigned_url(self, key: str) -> str | None:
        return f"https://s3.amazonaws.com/bucket/{key}?signature=test"

    def delete(self, key: str) -> bool:
        if key in self.store:
            del self.store[key]
        return True


@pytest.fixture(scope="function", autouse=True)
def mock_storage():
    mock = MockStorage()
    with patch("src.api.storage", mock):
        with patch("src.crud.storage", mock):
            yield mock


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    # Use a separate engine for each test to ensure no loop conflicts
    test_engine = create_async_engine(DATABASE_URL, echo=False)
    TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)

    # Ensure clean state and apply the current schema through Alembic
    async with test_engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))

    reset_database()

    async with TestSessionLocal() as session:
        yield session

    # Cleanup
    async with test_engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))

    await test_engine.dispose()


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
