from fastapi import APIRouter
from .api.v1 import auth as auth_router
from .api.v1 import tasks as tasks_router
from .api.v1 import assets as assets_router
from .api.v1 import scans as scans_router
from .api.v1 import admin as admin_router

router = APIRouter()

# Mount versioned routers (they already include /api/v1 prefix)
router.include_router(auth_router.router)
router.include_router(tasks_router.router)
router.include_router(assets_router.router)
router.include_router(scans_router.router)
router.include_router(admin_router.router)

@router.get("/")
async def root():
    return {"message": "Hello from backend!"}

@router.get("/api/health")
async def api_health():
    return {"status": "ok"}
