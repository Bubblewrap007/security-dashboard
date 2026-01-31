import time
import logging

logger = logging.getLogger(__name__)

def long_running_task(data: dict):
    logger.info("Starting long task with: %s", data)
    time.sleep(5)
    logger.info("Completed task")
    return {"status": "done", "input": data}
