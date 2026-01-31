import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_admin_requires_superuser():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        r = await ac.get("/api/v1/admin/users")
        assert r.status_code == 401

# More extensive tests requiring mocked users and tokens can be added in next iterations
