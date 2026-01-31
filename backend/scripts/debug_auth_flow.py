import os
os.environ['TESTING']='1'
import asyncio
from httpx import AsyncClient
from app.main import app
async def run():
    async with AsyncClient(app=app, base_url='http://test') as ac:
        r = await ac.post('/api/v1/auth/register', json={'username':'scanuser','email':'s@example.com','password':'pw'})
        print('register', r.status_code, r.text)
        r = await ac.post('/api/v1/auth/login', json={'identifier':'scanuser','password':'pw'})
        print('login', r.status_code, r.text, r.headers)
        print('cookies after login', ac.cookies.jar)
        r = await ac.post('/api/v1/assets', json={'type':'domain','value':'example.com'})
        print('add asset', r.status_code, r.headers, r.text)
        r = await ac.get('/api/v1/assets')
        print('list assets', r.status_code, r.text)

asyncio.run(run())
