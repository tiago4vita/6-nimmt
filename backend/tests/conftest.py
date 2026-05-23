from __future__ import annotations

import os

import pytest
import pytest_asyncio
from redis.asyncio import Redis, from_url

from app.infrastructure import locks, timers
from app.infrastructure import redis as redis_module

TEST_REDIS_URL = os.environ.get("TEST_REDIS_URL", "redis://localhost:6379/15")


async def _redis_available(url: str) -> bool:
    client = from_url(url, decode_responses=True)
    try:
        await client.ping()
    except Exception:
        return False
    finally:
        await client.aclose()
    return True


@pytest_asyncio.fixture
async def redis_client() -> Redis:
    if not await _redis_available(TEST_REDIS_URL):
        pytest.skip(f"Redis not reachable at {TEST_REDIS_URL}")

    client = from_url(TEST_REDIS_URL, decode_responses=True)
    await client.flushdb()
    redis_module._client = client
    locks.clear_all_locks()
    timers.clear_all()
    try:
        yield client
    finally:
        timers.clear_all()
        await client.flushdb()
        await client.aclose()
        redis_module._client = None
        locks.clear_all_locks()
