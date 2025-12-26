import pytest
import asyncio
from unittest.mock import MagicMock, patch
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.main import app
from src.db import Base, DATABASE_URL
from src.dependencies import get_db

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
    
    # Ensure clean state
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session
    
    # Cleanup
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await test_engine.dispose()

@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
