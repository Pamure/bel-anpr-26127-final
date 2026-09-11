import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from db import init_pool, close_pool, check_db_health
from routes import (
    detections_router,
    trajectory_router,
    alerts_router,
    blacklist_router,
    analytics_router,
    stream_router,
    v1_analytics_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    logger.info("Starting BEL ANPR 26127 backend...")
    try:
        await init_pool(min_size=2, max_size=10)
        healthy = await check_db_health()
        if healthy:
            logger.info("Database connection pool initialized successfully")
        else:
            logger.warning("Database health check failed")
    except Exception as e:
        # Do NOT crash the app: /health/db reports 503 until DB returns,
        # and pooled queries re-attempt connections on demand.
        logger.error(f"Failed to initialize database pool (starting degraded): {e}")

    yield

    # Shutdown
    logger.info("Shutting down BEL ANPR 26127 backend...")
    await close_pool()
    logger.info("Database connection pool closed")


app = FastAPI(
    title="BEL ANPR 26127 - City-Wide AI Engine for Multi-Camera ANPR",
    description="Smart India Hackathon 2026 - Problem Statement 26127",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# API Key authentication middleware
@app.middleware("http")
async def api_key_auth(request: Request, call_next):
    """Validate API key for private endpoints."""
    # Public paths that don't require authentication
    public_paths = {
        "/",
        "/health",
        "/health/db",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/favicon.ico",
    }

    # Check if path is public
    if request.url.path in public_paths or request.url.path.startswith("/static"):
        return await call_next(request)

    # Check API key for /api/* routes
    if request.url.path.startswith("/api/"):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Missing or invalid Authorization header"},
            )

        api_key = auth_header[7:].strip()  # Remove "Bearer "
        if api_key != settings.api_key:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"error": "Invalid API key"},
            )

    return await call_next(request)


# Health endpoints (public)
@app.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe."""
    return {"status": "ok", "service": "bel-anpr-26127"}


@app.get("/health/db", tags=["Health"])
async def health_db():
    """Readiness probe - checks database connectivity."""
    healthy = await check_db_health()
    if healthy:
        return {"status": "ok", "db": "connected"}
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "error", "db": "disconnected"},
    )


# Include routers
app.include_router(detections_router)
app.include_router(trajectory_router)
app.include_router(alerts_router)
app.include_router(blacklist_router)
app.include_router(analytics_router)
app.include_router(stream_router)
app.include_router(v1_analytics_router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "BEL ANPR 26127",
        "description": "City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8088,
        reload=False,
        workers=1,
    )