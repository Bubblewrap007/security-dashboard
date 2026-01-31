from fastapi import APIRouter, BackgroundTasks
from rq import Queue
from redis import Redis
import os
from ...tasks.sample import long_running_task

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
# simple enqueue endpoint
@router.post("/enqueue")
async def enqueue(data: dict):
    r = Redis.from_url(REDIS_URL)
    q = Queue(connection=r)
    job = q.enqueue(long_running_task, data)
    return {"job_id": job.get_id(), "status": "queued"}
