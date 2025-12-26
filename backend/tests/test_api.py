import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone

@pytest.mark.asyncio
async def test_create_gist(client: AsyncClient):
    payload = {
        "gist_metadata": {"iv": "test_iv"},
        "max_reads": 5
    }
    response = await client.post("/api/gists", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "gist_id" in data
    assert "upload_params" in data
    assert "url" in data["upload_params"]

@pytest.mark.asyncio
async def test_get_gist(client: AsyncClient):
    # 1. Create
    payload = {
        "gist_metadata": {"iv": "test_iv"},
        "max_reads": 5
    }
    create_res = await client.post("/api/gists", json=payload)
    gist_id = create_res.json()["gist_id"]

    # 2. Get
    get_res = await client.get(f"/api/gists/{gist_id}")
    assert get_res.status_code == 200
    data = get_res.json()
    assert "download_url" in data
    assert "https://s3.amazonaws.com/bucket/" in data["download_url"]
    assert data["read_count"] == 1  # Incremented on read

@pytest.mark.asyncio
async def test_read_limit(client: AsyncClient):
    # 1. Create with max_reads=1
    payload = {
        "gist_metadata": {},
        "max_reads": 1
    }
    create_res = await client.post("/api/gists", json=payload)
    gist_id = create_res.json()["gist_id"]

    # 2. First read (should succeed)
    res1 = await client.get(f"/api/gists/{gist_id}")
    assert res1.status_code == 200

    # 3. Second read (should fail - 410 Gone)
    res2 = await client.get(f"/api/gists/{gist_id}")
    assert res2.status_code == 410

@pytest.mark.asyncio
async def test_expiration(client: AsyncClient):
    # 1. Create with expiration in the past
    past_date = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    payload = {
        "gist_metadata": {},
        "expiration_date": past_date
    }
    create_res = await client.post("/api/gists", json=payload)
    gist_id = create_res.json()["gist_id"]

    # 2. Get (should fail - 410 Gone)
    res = await client.get(f"/api/gists/{gist_id}")
    assert res.status_code == 410

@pytest.mark.asyncio
async def test_delete_gist(client: AsyncClient):
    # 1. Create
    payload = {
        "gist_metadata": {}
    }
    create_res = await client.post("/api/gists", json=payload)
    gist_id = create_res.json()["gist_id"]

    # 2. Delete
    del_res = await client.delete(f"/api/gists/{gist_id}")
    assert del_res.status_code == 204

    # 3. Get (should fail - 404 Not Found)
    get_res = await client.get(f"/api/gists/{gist_id}")
    assert get_res.status_code == 404
