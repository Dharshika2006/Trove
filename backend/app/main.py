import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.security import setup_oauth
from app.db.session import init_db
from app.api.routes import router
from app.api.websocket import websocket_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting Trove backend...")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Create upload directory
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(os.path.dirname(settings.sqlite_db_path) or ".", exist_ok=True)
    
    # Setup OAuth providers
    setup_oauth()
    logger.info("OAuth providers configured")
    
    yield
    
    logger.info("Shutting down Trove backend...")

app = FastAPI(
    title="Trove - Multi-Agent Research Assistant",
    description="AI-powered research assistant using multiple collaborating agents",
    version="0.1.0",
    lifespan=lifespan,
)

# Session middleware (required for OAuth state management)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.jwt_secret_key,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiter setup
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from app.core.limiter import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Include routers
app.include_router(router, prefix="")
app.include_router(websocket_router, prefix="")
