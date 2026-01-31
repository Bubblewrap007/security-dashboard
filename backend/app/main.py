from fastapi import FastAPI
from .routes import router
from .middleware.security import SecurityHeadersMiddleware
from .middleware.rate_limit import RateLimitMiddleware
from .db.client import init_db, close_db
import os
from fastapi.middleware.cors import CORSMiddleware

ENV = os.getenv("ENV", "development")
app = FastAPI(title="Security Dashboard - Backend (Secure)", docs_url=("/docs" if ENV != "production" else None), redoc_url=("/redoc" if ENV != "production" else None))

# CORS - allow configured frontend origins; avoid wildcard in production
def _get_cors_origins():
    env_origins = os.getenv("CORS_ORIGINS", "").strip()
    if env_origins:
        return [o.strip() for o in env_origins.split(",") if o.strip()]
    if ENV == "production":
        return [
            "https://atlanticitsupport.com",
            "https://www.atlanticitsupport.com",
            "https://dashboard.atlanticitsupport.com"
        ]
    return ["http://localhost:5173", "http://localhost", "http://localhost:80"]

origins = _get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.add_middleware(SecurityHeadersMiddleware)

# Register RateLimitMiddleware at import time unless we're running tests. Tests set
# `TESTING=1` in `tests/conftest.py` (and `pytest` will be present in `sys.modules`), so this
# check ensures middleware is not installed during test runs while still being present in
# normal runtime (including containerized production).
import sys
if not ("pytest" in sys.modules or os.getenv("TESTING", "0") == "1"):
    app.add_middleware(RateLimitMiddleware)

app.include_router(router)

from .core.logging_config import configure_logging

logger = configure_logging()

@app.on_event("startup")
async def startup():
    # Initialize DB connection during startup; the RateLimitMiddleware is already
    # registered at import time when appropriate.
    init_db(os.getenv("MONGO_URI", "mongodb://mongo:27017/mydb"))
    if ENV == "production" and os.getenv("SECRET_KEY", "CHANGE_ME") == "CHANGE_ME":
        logger.warning("SECRET_KEY is not set for production; set SECRET_KEY in the environment.")
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown():
    close_db()
    logger.info("Application shutdown complete")

@app.get("/health")
async def health():
    return {"status": "ok"}
