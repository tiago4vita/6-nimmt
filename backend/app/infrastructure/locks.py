from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

_room_locks: dict[str, asyncio.Lock] = {}


def get_room_lock(room_id: str) -> asyncio.Lock:
    lock = _room_locks.get(room_id)
    if lock is None:
        lock = asyncio.Lock()
        _room_locks[room_id] = lock
    return lock


@asynccontextmanager
async def room_lock(room_id: str) -> AsyncIterator[None]:
    lock = get_room_lock(room_id)
    async with lock:
        yield


def drop_room_lock(room_id: str) -> None:
    _room_locks.pop(room_id, None)


def clear_all_locks() -> None:
    """Test helper — wipe the lock registry."""
    _room_locks.clear()
