import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Use async driver for SQLite (aiosqlite)

load_dotenv()
DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL")

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Async dependency for FastAPI
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
