from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from datetime import datetime, timezone
from .models import Gist
from .storage import storage


async def create_gist(db: AsyncSession, gist_metadata: dict, expiration_date: str = None, max_reads: int = 100):
    exp_date = None
    if expiration_date:
        dt = datetime.fromisoformat(expiration_date)
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        exp_date = dt

    # Create DB record
    gist = Gist(
        gist_metadata=gist_metadata,
        expiration_date=exp_date,
        max_reads=max_reads
    )
    db.add(gist)
    await db.commit()
    await db.refresh(gist)
    
    return gist


async def get_gist(db: AsyncSession, gist_id: str):
    result = await db.execute(select(Gist).where(Gist.gist_id == gist_id))
    gist = result.scalar_one_or_none()
    return gist


async def delete_gist(db: AsyncSession, gist_id: str):
    result = await db.execute(select(Gist).where(Gist.gist_id == gist_id))
    gist = result.scalar_one_or_none()
    if gist:
        await db.delete(gist)
        await db.commit()
        # Delete from S3
        storage.delete(str(gist.gist_id))
    return gist
