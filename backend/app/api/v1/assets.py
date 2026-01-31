from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from ...schemas.user import UserCreate
from ...models.asset import AssetCreate
from ...repositories.assets import AssetRepository
from ...core.security import decode_access_token
import json

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])

async def get_current_user_id(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return str(payload.get("sub"))

@router.post("", status_code=201)
async def create_asset(payload: AssetCreate, user_id: str = Depends(get_current_user_id)):
    repo = AssetRepository()
    try:
        asset = await repo.create(user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    # return a plain dict so JSON contains friendly 'id' field
    return asset.model_dump()

@router.get("")
async def list_assets(user_id: str = Depends(get_current_user_id)):
    repo = AssetRepository()
    assets = await repo.list_by_user(user_id)
    # normalize to plain dicts with 'id' field
    return [a.model_dump() for a in assets]

@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, user_id: str = Depends(get_current_user_id)):
    repo = AssetRepository()
    asset = await repo.get(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if str(asset.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    ok = await repo.delete(asset_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete asset")
    return {"status": "deleted"}
