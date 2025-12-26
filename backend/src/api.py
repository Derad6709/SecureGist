from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
from .dependencies import get_db
from .schemas import GistCreate, GistResponse, GistCreateResponse
from .crud import create_gist, get_gist, delete_gist
from .models import Gist
from .storage import storage

router = APIRouter()


@router.post("/api/gists", response_model=GistCreateResponse, status_code=status.HTTP_201_CREATED)
async def api_create_gist(payload: GistCreate, db: AsyncSession = Depends(get_db)):
    gist = await create_gist(db, payload.gist_metadata, payload.expiration_date, payload.max_reads)
    
    # Generate Presigned POST
    presigned_post = storage.generate_presigned_post(str(gist.gist_id))
    if not presigned_post:
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")

    return GistCreateResponse(
        gist_id=gist.gist_id,
        upload_params=presigned_post
    )


@router.get("/api/gists/{gist_id}", response_model=GistResponse)
async def api_get_gist(gist_id: str, db: AsyncSession = Depends(get_db)):
    gist = await get_gist(db, gist_id)
    if not gist:
        raise HTTPException(status_code=404, detail="Gist not found")
    # Check expiration
    if gist.expiration_date and gist.expiration_date < datetime.now(timezone.utc).replace(tzinfo=None):
        await delete_gist(db, gist_id)
        raise HTTPException(status_code=410, detail="Gist expired")
    # Check read count
    if gist.read_count >= gist.max_reads:
        await delete_gist(db, gist_id)
        raise HTTPException(status_code=410, detail="Read limit exceeded")
    
    gist.read_count += 1
    await db.commit()

    download_url = storage.generate_presigned_url(str(gist.gist_id))

    return GistResponse(
        gist_id=gist.gist_id,
        download_url=download_url,
        gist_metadata=gist.gist_metadata,
        expiration_date=gist.expiration_date.isoformat() if gist.expiration_date else None,
        read_count=gist.read_count,
        max_reads=gist.max_reads,
        version_history=gist.version_history,
    )


@router.delete("/api/gists/{gist_id}", status_code=204)
async def api_delete_gist(gist_id: str, db: AsyncSession = Depends(get_db)):
    gist = await delete_gist(db, gist_id)
    if not gist:
        raise HTTPException(status_code=404, detail="Gist not found")
    return Response(status_code=204)
