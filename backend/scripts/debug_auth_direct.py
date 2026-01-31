import os
os.environ['TESTING']='1'
import asyncio
from app.services.auth_service import AuthService
from app.repositories.users import UserRepository
async def run():
    repo = UserRepository()
    auth = AuthService(repo)
    class P: pass
    p = P(); p.username='scanuser'; p.email='s@example.com'; p.password='pw'
    user = await auth.register(p)
    print('created', user)
    found = await repo.get_by_username('scanuser')
    print('found', found)
    authn = await auth.authenticate('scanuser','pw')
    print('authn', authn)

asyncio.run(run())
