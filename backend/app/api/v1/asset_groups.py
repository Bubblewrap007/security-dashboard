from fastapi import APIRouter, Depends, HTTPException, status, Request
from ...models.asset_group import AssetGroupBase
from ...repositories.asset_groups import AssetGroupRepository
from ...core.security import decode_access_token

router = APIRouter(prefix="/api/v1/asset-groups", tags=["asset-groups"])


async def get_current_user_id(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return str(payload.get("sub"))


@router.get("")
async def list_groups(user_id: str = Depends(get_current_user_id)):
    repo = AssetGroupRepository()
    groups = await repo.list_by_user(user_id)
    return [g.model_dump() for g in groups]


@router.post("", status_code=201)
async def create_group(payload: AssetGroupBase, user_id: str = Depends(get_current_user_id)):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Group name cannot be empty")
    repo = AssetGroupRepository()
    group = await repo.create(user_id, payload.name.strip(), payload.asset_ids)
    return group.model_dump()


@router.put("/{group_id}")
async def update_group(group_id: str, payload: AssetGroupBase, user_id: str = Depends(get_current_user_id)):
    repo = AssetGroupRepository()
    group = await repo.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if str(group.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Group name cannot be empty")
    ok = await repo.update(group_id, payload.name.strip(), payload.asset_ids)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update group")
    return {"status": "updated"}


@router.delete("/{group_id}")
async def delete_group(group_id: str, user_id: str = Depends(get_current_user_id)):
    repo = AssetGroupRepository()
    group = await repo.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if str(group.user_id) != str(user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    ok = await repo.delete(group_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete group")
    return {"status": "deleted"}
