from fastapi import APIRouter, Depends, HTTPException, status
from ...api.v1.deps import require_superuser, get_current_user
from ...repositories.users import UserRepository
from ...schemas.user import UserOut

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

@router.get("/users", response_model=list[UserOut])
async def list_users(current_user = Depends(require_superuser)):
    repo = UserRepository()
    users = await repo.list_users()
    return users

from ...repositories.audit import AuditRepository

@router.post("/users/{user_id}/promote", response_model=UserOut)
async def promote_user(user_id: str, current_user = Depends(require_superuser)):
    repo = UserRepository()
    user = await repo.set_superuser(user_id, True)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # audit
    await AuditRepository().create_event(actor_id=current_user.id, action="promote_user", target_type="user", target_id=user.id, details={"promoted_by": current_user.username})
    return user

@router.post("/users/{user_id}/demote", response_model=UserOut)
async def demote_user(user_id: str, current_user = Depends(require_superuser)):
    repo = UserRepository()
    user = await repo.set_superuser(user_id, False)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # audit
    await AuditRepository().create_event(actor_id=current_user.id, action="demote_user", target_type="user", target_id=user.id, details={"demoted_by": current_user.username})
    return user