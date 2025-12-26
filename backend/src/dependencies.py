from .db import SessionLocal

async def get_db():
    async with SessionLocal() as db:
        yield db
