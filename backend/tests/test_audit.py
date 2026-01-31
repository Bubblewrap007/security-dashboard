import pytest
from httpx import AsyncClient
from app.main import app
from app.models.audit import AuditEventInDB

class FakeAuditRepo:
    def __init__(self):
        if not hasattr(FakeAuditRepo, 'events'):
            FakeAuditRepo.events = []
    async def create_event(self, actor_id, action, target_type=None, target_id=None, details=None):
        FakeAuditRepo.events.append({'actor_id': actor_id, 'action': action, 'target_type': target_type, 'target_id': target_id, 'details': details or {}})
        return AuditEventInDB(**{'_id':'1','actor_id':actor_id,'action':action,'target_type':target_type,'target_id':target_id,'details':details or {}})

@pytest.fixture(autouse=True)
def patch_audit(monkeypatch):
    import app.api.v1.admin as admin_mod
    import app.api.v1.auth as auth_mod
    import app.api.v1.scans as scans_mod
    monkeypatch.setattr(admin_mod, 'AuditRepository', FakeAuditRepo)
    monkeypatch.setattr(auth_mod, 'AuditRepository', FakeAuditRepo)
    monkeypatch.setattr(scans_mod, 'AuditRepository', FakeAuditRepo)
    FakeAuditRepo.events = []
    yield

@pytest.mark.asyncio
async def test_register_creates_audit():
    async with AsyncClient(app=app, base_url='http://test') as ac:
        r = await ac.post('/api/v1/auth/register', json={'username':'al','email':'al@example.com','password':'pw'})
        assert r.status_code == 200
        # expect an audit event for register
        assert any(e['action']=='register' for e in FakeAuditRepo.events)

@pytest.mark.asyncio
async def test_start_scan_creates_audit():
    # create user and login
    async with AsyncClient(app=app, base_url='http://test') as ac:
        r = await ac.post('/api/v1/auth/register', json={'username':'scanuser','email':'s@example.com','password':'pw'})
        r = await ac.post('/api/v1/auth/login', json={'identifier':'scanuser','password':'pw'})
        # add asset
        r = await ac.post('/api/v1/assets', json={'type':'domain','value':'example.com'})
        asset = r.json()
        r = await ac.post('/api/v1/scans', json={'asset_ids':[asset['id']]})
        assert r.status_code == 201
        assert any(e['action']=='start_scan' for e in FakeAuditRepo.events)
