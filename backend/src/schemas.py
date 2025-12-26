from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any, List
from uuid import UUID
from datetime import datetime


class GistCreate(BaseModel):
    gist_metadata: dict
    expiration_date: Optional[str] = None
    max_reads: Optional[int] = 100


class GistCreateResponse(BaseModel):
    gist_id: UUID
    upload_params: dict


class GistResponse(BaseModel):
    gist_id: UUID
    download_url: Optional[str] = None
    gist_metadata: dict
    expiration_date: Optional[str] = None
    read_count: int
    max_reads: int
    version_history: Optional[List[Any]] = None
