import pytest
from httpx import AsyncClient
from bson import ObjectId
from app.main import app
from app.models.user import UserInDB
from app.core.security import get_password_hash, verify_password

# Simple in-memory fake repository for users
class FakeUserRepo:
    def __init__(self):
        # storage: id -> doc
        if not hasattr(FakeUserRepo, "storage"):
            FakeUserRepo.storage = {}
            FakeUserRepo.counter = 1

    async def get_by_username(self, username: str):
        for d in FakeUserRepo.storage.values():
            if d["username"] == username:
                d_copy = dict(d)
                return UserInDB(**d_copy)
        return None

    async def create_user(self, user_dict: dict):
        # Generate a valid ObjectId string for testing purposes
        uid = str(ObjectId())
        FakeUserRepo.counter += 1 # Keep counter for potential other uses, though not directly used for uid anymore
        user_dict = dict(user_dict)
        user_dict.setdefault("roles", [])
        user_dict.setdefault("is_superuser", False)
        user_dict.setdefault("is_active", True)
        user_dict["_id"] = uid
        FakeUserRepo.storage[uid] = user_dict
        return UserInDB(**user_dict)

    async def get_by_id(self, id: str):
        d = FakeUserRepo.storage.get(str(id))
        if not d:
            return None
        return UserInDB(**dict(d))

    async def list_users(self):
        return [UserInDB(**dict(d)) for d in FakeUserRepo.storage.values()]

    async def set_superuser(self, user_id: str, is_super: bool):
        d = FakeUserRepo.storage.get(str(user_id))
        if not d:
            return None
        d["is_superuser"] = bool(is_super)
        FakeUserRepo.storage[str(user_id)] = d
        return UserInDB(**d)

@pytest.fixture(autouse=True)
def fake_repo_monkeypatch(monkeypatch):
    # Patch all modules that import UserRepository at module level
    import app.services.auth_service as auth_svc
    import app.api.v1.deps as deps_mod
    import app.api.v1.admin as admin_mod
    import app.api.v1.auth as auth_mod

    monkeypatch.setattr(auth_svc, 'UserRepository', FakeUserRepo)
    monkeypatch.setattr(deps_mod, 'UserRepository', FakeUserRepo)
    monkeypatch.setattr(admin_mod, 'UserRepository', FakeUserRepo)
    monkeypatch.setattr(auth_mod, 'UserRepository', FakeUserRepo)

    # Reset storage between tests
    FakeUserRepo.storage = {}
    FakeUserRepo.counter = 1
    yield

@pytest.mark.asyncio
async def test_admin_requires_superuser():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/api/v1/admin/users")
        assert r.status_code == 401

@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # register a normal user
        r = await ac.post("/api/v1/auth/register", json={"username": "user1", "email": "u1@example.com", "password": "pass123"})
        assert r.status_code == 200
        # login
        r = await ac.post("/api/v1/auth/login", json={"identifier": "user1", "password": "pass123"})
        assert r.status_code == 200
        # attempt admin access
        r = await ac.get("/api/v1/admin/users")
        assert r.status_code == 403

@pytest.mark.asyncio
async def test_superuser_can_list_and_promote_and_demote():
    # setup: create a superuser directly in storage
    from app.core.security import get_password_hash
    pwd = "superpass"
    sup_doc = {"username": "admin", "email": "admin@example.com", "hashed_password": get_password_hash(pwd), "is_active": True, "is_superuser": True}
    repo = FakeUserRepo()
    admin_user = await repo.create_user(sup_doc)

    async with AsyncClient(app=app, base_url="http://test") as ac:
        # login as admin
        r = await ac.post("/api/v1/auth/login", json={"identifier": "admin", "password": pwd})
        assert r.status_code == 200
        # register regular user
        r = await ac.post("/api/v1/auth/register", json={"username": "bob", "email": "bob@example.com", "password": "bpass"})
        assert r.status_code == 200
        new_user = r.json()
        # list users
        r = await ac.get("/api/v1/admin/users")
        assert r.status_code == 200
        users = r.json()
        assert any(u["username"] == "bob" for u in users)
        # promote bob
        bob_id = new_user["id"]
        r = await ac.post(f"/api/v1/admin/users/{bob_id}/promote")
        assert r.status_code == 200
        assert r.json().get("is_superuser") is True
        # demote bob
        r = await ac.post(f"/api/v1/admin/users/{bob_id}/demote")
        assert r.status_code == 200
        assert r.json().get("is_superuser") is False

@pytest.mark.asyncio
async def test_promoted_user_can_access_admin():
    # create admin user and a bob
    from app.core.security import get_password_hash
    repo = FakeUserRepo()
    admin = await repo.create_user({"username": "admin2", "email": "a2@example.com", "hashed_password": get_password_hash("apass"), "is_active": True, "is_superuser": True})
    bob = await repo.create_user({"username": "bob2", "email": "b2@example.com", "hashed_password": get_password_hash("bpass"), "is_active": True, "is_superuser": False})

    async with AsyncClient(app=app, base_url="http://test") as ac:
        # login as admin and promote bob
        r = await ac.post("/api/v1/auth/login", json={"identifier": "admin2", "password": "apass"})
        assert r.status_code == 200
        r = await ac.post(f"/api/v1/admin/users/{bob.id}/promote")
        assert r.status_code == 200
        # login as bob and access admin
        r = await ac.post("/api/v1/auth/login", json={"identifier": "bob2", "password": "bpass"})
        assert r.status_code == 200
        r = await ac.get("/api/v1/admin/users")
        assert r.status_code == 200
