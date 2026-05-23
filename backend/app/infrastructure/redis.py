from __future__ import annotations

import json
from typing import Any

from redis.asyncio import Redis, from_url

from app.config import settings


def guest_session_key(guest_id: str) -> str:
    return f"guest:session:{guest_id}"


def guest_current_room_key(guest_id: str) -> str:
    return f"guest:{guest_id}:current_room"


def room_key(room_id: str) -> str:
    return f"room:{room_id}"


def room_code_key(code: str) -> str:
    return f"room:code:{code}"


def room_channel(room_id: str) -> str:
    return f"room:{room_id}"


_client: Redis | None = None


async def connect() -> Redis:
    """Create the shared Redis client. Called once in the FastAPI lifespan."""
    global _client
    if _client is None:
        _client = from_url(settings.redis_url, decode_responses=True)
    return _client


async def close() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def get_client() -> Redis:
    if _client is None:
        msg = "Redis client not initialised — call connect() in app lifespan"
        raise RuntimeError(msg)
    return _client


async def set_json(
    key: str,
    value: Any,
    *,
    ttl_seconds: int | None = None,
    client: Redis | None = None,
) -> None:
    redis = client or get_client()
    payload = json.dumps(value, default=str)
    if ttl_seconds is not None:
        await redis.set(key, payload, ex=ttl_seconds)
    else:
        await redis.set(key, payload)


async def get_json(key: str, *, client: Redis | None = None) -> Any | None:
    redis = client or get_client()
    raw = await redis.get(key)
    if raw is None:
        return None
    return json.loads(raw)
