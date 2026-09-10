import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.main import app
from app.db.session import Base, get_db
from app.db.models import User
from app.api.deps import get_current_user, get_optional_user
import uuid

from datetime import datetime, timezone

from sqlalchemy.pool import StaticPool

# Use in-memory SQLite for testing
TEST_DATABASE_URL = 'sqlite+aiosqlite:///:memory:'

engine = create_async_engine(
    TEST_DATABASE_URL, 
    echo=False, 
    poolclass=StaticPool,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

@pytest_asyncio.fixture(autouse=True)
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture
async def db_session():
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def mock_user(db_session):
    user = User(
        id=str(uuid.uuid4()),
        email='testuser@example.com',
        name='Test User',
        google_id='test-google-id',
        github_id='test-github-id',
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    await db_session.commit()
    return user

@pytest_asyncio.fixture
async def client(db_session, mock_user):
    # Override dependencies
    async def override_get_db():
        yield db_session
        
    async def override_get_current_user():
        return mock_user
        
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_optional_user] = override_get_current_user
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as c:
        yield c
        
    # Clean up overrides
    app.dependency_overrides.clear()
