from __future__ import annotations

import asyncio
import contextlib
import logging
from datetime import UTC, datetime

from app.config import settings

log = logging.getLogger(__name__)

_submit_tasks: dict[str, asyncio.Task[None]] = {}
_disconnect_tasks: dict[tuple[str, str], asyncio.Task[None]] = {}


async def _sleep_until(deadline: datetime) -> None:
    delay = (deadline - datetime.now(UTC)).total_seconds()
    if delay > 0:
        await asyncio.sleep(delay)


async def _submit_timeout_runner(room_id: str, deadline: datetime) -> None:
    try:
        await _sleep_until(deadline)
    except asyncio.CancelledError:
        return

    from app.infrastructure import game

    try:
        await game.handle_submit_timeout(room_id)
    except Exception:
        log.exception("Submit timeout handler failed for room %s", room_id)
    finally:
        _submit_tasks.pop(room_id, None)


def schedule_submit_deadline(room_id: str, deadline: datetime) -> None:
    cancel_submit_deadline(room_id)
    task = asyncio.create_task(
        _submit_timeout_runner(room_id, deadline),
        name=f"submit-timeout:{room_id}",
    )
    _submit_tasks[room_id] = task


def cancel_submit_deadline(room_id: str) -> None:
    task = _submit_tasks.pop(room_id, None)
    if task is not None and not task.done():
        task.cancel()


async def _disconnect_runner(room_id: str, guest_id: str) -> None:
    try:
        await asyncio.sleep(settings.disconnect_grace_seconds)
    except asyncio.CancelledError:
        return

    from app.infrastructure import game

    try:
        await game.mark_disconnected(room_id, guest_id)
    except Exception:
        log.exception("Disconnect grace handler failed for %s/%s", room_id, guest_id)
    finally:
        _disconnect_tasks.pop((room_id, guest_id), None)


def schedule_disconnect(room_id: str, guest_id: str) -> None:
    cancel_disconnect(room_id, guest_id)
    task = asyncio.create_task(
        _disconnect_runner(room_id, guest_id),
        name=f"disconnect:{room_id}:{guest_id}",
    )
    _disconnect_tasks[(room_id, guest_id)] = task


def cancel_disconnect(room_id: str, guest_id: str) -> None:
    task = _disconnect_tasks.pop((room_id, guest_id), None)
    if task is not None and not task.done():
        task.cancel()


async def cancel_all_for_room(room_id: str) -> None:
    cancel_submit_deadline(room_id)
    for key in list(_disconnect_tasks.keys()):
        if key[0] == room_id:
            cancel_disconnect(*key)


async def shutdown() -> None:
    tasks = list(_submit_tasks.values()) + list(_disconnect_tasks.values())
    _submit_tasks.clear()
    _disconnect_tasks.clear()
    for task in tasks:
        task.cancel()
    for task in tasks:
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await task


def clear_all() -> None:
    """Test helper — abandon any pending tasks without awaiting them."""
    for task in list(_submit_tasks.values()) + list(_disconnect_tasks.values()):
        task.cancel()
    _submit_tasks.clear()
    _disconnect_tasks.clear()
