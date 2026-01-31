from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, Any, Dict, List
import logging
import os
from bson import ObjectId

logger = logging.getLogger(__name__)

client: Optional[AsyncIOMotorClient] = None


class InMemoryCollection:
    def __init__(self):
        self._data: List[Dict[str, Any]] = []

    async def find_one(self, query: Dict[str, Any]):
        for d in self._data:
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return d.copy()
        return None

    async def insert_one(self, doc: Dict[str, Any]):
        _id = str(ObjectId())
        doc_copy = doc.copy()
        doc_copy["_id"] = _id
        self._data.append(doc_copy)
        class Res: pass
        r = Res()
        r.inserted_id = _id
        return r

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        for i, d in enumerate(self._data):
            match = True
            for k, v in query.items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                # simple $set handling
                if "$set" in update:
                    for k, v in update["$set"].items():
                        d[k] = v
                self._data[i] = d
                class Res: pass
                r = Res()
                r.matched_count = 1
                r.modified_count = 1
                return r
        class Res: pass
        r = Res()
        r.matched_count = 0
        r.modified_count = 0
        return r

    def find(self, query: Dict[str, Any]):
        async def gen():
            for d in self._data:
                yield d.copy()
        return gen()


class InMemoryDB:
    def __init__(self):
        self._collections: Dict[str, InMemoryCollection] = {}

    def get_collection(self, name: str) -> InMemoryCollection:
        if name not in self._collections:
            self._collections[name] = InMemoryCollection()
        return self._collections[name]


class InMemoryClient:
    def __init__(self):
        self._db = InMemoryDB()

    def get_default_database(self):
        return self._db


def init_db(mongo_uri: str):
    """Initialize a real MongoDB client. In tests, set TESTING=1 to use in-memory fake client."""
    global client
    if client is None:
        if os.getenv("TESTING") == "1":
            client = InMemoryClient()
            logger.info("Using in-memory MongoDB client for testing")
        else:
            client = AsyncIOMotorClient(mongo_uri)
            logger.info("Connected to MongoDB")


import sys

def get_db():
    global client
    if client is None:
        # If tests didn't call init_db, fall back to in-memory client when running tests.
        if os.getenv("TESTING") == "1" or 'pytest' in sys.modules:
            client = InMemoryClient()
            logger.info("Using in-memory MongoDB client (get_db singleton)")
            return client
        raise RuntimeError("Database client not initialized")
    return client


def close_db():
    global client
    if client and not isinstance(client, InMemoryClient):
        client.close()
        logger.info("MongoDB connection closed")
    client = None
