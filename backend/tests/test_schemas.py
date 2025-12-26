import pytest
from src.schemas import GistCreate, GistResponse
from uuid import uuid4

def test_gist_create_valid():
    data = {
        "gist_metadata": {"iv": "1234"},
        "expiration_date": "2025-01-01T12:00:00Z",
        "max_reads": 5
    }
    model = GistCreate(**data)
    assert model.max_reads == 5

def test_gist_create_defaults():
    data = {
        "gist_metadata": {"iv": "1234"}
    }
    model = GistCreate(**data)
    assert model.max_reads == 100
    assert model.expiration_date is None

def test_gist_response_model():
    gist_id = uuid4()
    data = {
        "gist_id": gist_id,
        "download_url": "https://example.com/file",
        "gist_metadata": {"iv": "1234"},
        "read_count": 0,
        "max_reads": 10
    }
    model = GistResponse(**data)
    assert model.gist_id == gist_id
    assert model.read_count == 0
