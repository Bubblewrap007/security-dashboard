from fastapi import APIRouter, BackgroundTasks
from rq import Queue
from redis import Redis
import os
import asyncio
from ...tasks.sample import long_running_task

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# simple enqueue endpoint
@router.post("/enqueue")
async def enqueue(data: dict):
    def _enqueue():
        r = Redis.from_url(REDIS_URL, socket_connect_timeout=5, socket_timeout=5)
        q = Queue(connection=r)
        return q.enqueue(long_running_task, data).get_id()

    loop = asyncio.get_event_loop()
    job_id = await loop.run_in_executor(None, _enqueue)
    return {"job_id": job_id, "status": "queued"}
