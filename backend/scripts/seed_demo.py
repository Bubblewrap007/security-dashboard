import asyncio
from app.db.client import init_db
from app.repositories.assets import AssetRepository
from app.repositories.scans import ScanRepository
from app.repositories.users import UserRepository
from app.models.asset import AssetCreate
from app.models.scan import ScanBase
from app.core.security import get_password_hash

async def seed():
    init_db("mongodb://mongo:27017/mydb")
    # create demo user
    ur = UserRepository()
    # Very simple: create user directly in users collection for demo
    user = {"username": "demo", "email": "demo@example.example.com", "hashed_password": "$2b$12$dummyhash", "is_active": True}
    u = await ur._col.insert_one(user)
    user_id = str(u.inserted_id)
    ar = AssetRepository()
    a1 = await ar.create(user_id, payload=AssetCreate(type="email", value="admin@example.com"))
    a2 = await ar.create(user_id, payload=AssetCreate(type="domain", value="example.com"))
    sr = ScanRepository()
    scan = await sr.create(user_id, payload=ScanBase(asset_ids=[a1.id, a2.id]))
    print("Seeded demo user", user_id)

    # Create test user with proper password hash
    test_password_hash = get_password_hash("test123")
    test_user = {
        "username": "test",
        "email": "test@example.com",
        "hashed_password": test_password_hash,
        "is_active": True,
        "is_superuser": False
    }
    tu = await ur._col.insert_one(test_user)
    test_user_id = str(tu.inserted_id)
    print("Seeded test user: username='test', password='test123'", test_user_id)

    # Create sample assets and scan for test user
    ta1 = await ar.create(test_user_id, payload=AssetCreate(type="email", value="test@example.com"))
    ta2 = await ar.create(test_user_id, payload=AssetCreate(type="domain", value="test.com"))
    tscan = await sr.create(test_user_id, payload=ScanBase(asset_ids=[ta1.id, ta2.id]))
    print("Seeded sample data for test user")

if __name__ == "__main__":
    asyncio.run(seed())
