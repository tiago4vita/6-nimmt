from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections.abc import Awaitable, Callable

from redis.asyncio import Redis

from app.domain.game import GamePhase
from app.infrastructure import redis as redis_keys
from app.infrastructure.models import GameRoomState

log = logging.getLogger(__name__)

StateUpdateCallback = Callable[["StateUpdate", GameRoomState | None], Awaitable[None]]


class StateUpdate:
    __slots__ = ("event", "room_id", "version", "phase")

    def __init__(self, *, event: str, room_id: str, version: int, phase: str) -> None:
        self.event = event
        self.room_id = room_id
        self.version = version
        self.phase = phase

    @classmethod
    def from_payload(cls, payload: dict[str, str]) -> StateUpdate:
        return cls(
            event=payload.get("event", "STATE_UPDATED"),
            room_id=payload["roomId"],
            version=int(payload.get("version", 0)),
            phase=str(payload.get("phase", "")),
        )


class SubscriberRegistry:
    """In-process map of room_id → set of async callbacks."""

    def __init__(self) -> None:
        self._subscribers: dict[str, set[StateUpdateCallback]] = {}

    def register(self, room_id: str, callback: StateUpdateCallback) -> None:
        self._subscribers.setdefault(room_id, set()).add(callback)

    def unregister(self, room_id: str, callback: StateUpdateCallback) -> None:
        bucket = self._subscribers.get(room_id)
        if bucket is None:
            return
        bucket.discard(callback)
        if not bucket:
            self._subscribers.pop(room_id, None)

    def has_subscribers(self, room_id: str) -> bool:
        return bool(self._subscribers.get(room_id))

    async def dispatch(self, update: StateUpdate) -> None:
        bucket = self._subscribers.get(update.room_id)
        if not bucket:
            return

        room: GameRoomState | None = None
        if update.event == "STATE_UPDATED":
            from app.infrastructure import rooms as room_service

            loaded = await room_service.load_room(update.room_id)
            if loaded is not None and loaded.version == update.version:
                room = loaded

        for callback in list(bucket):
            try:
                await callback(update, room)
            except Exception:
                log.exception("Subscriber callback failed for room %s", update.room_id)

    def clear(self) -> None:
        self._subscribers.clear()


registry = SubscriberRegistry()


async def publish_state_update(
    room_id: str,
    *,
    version: int,
    phase: GamePhase | str,
    client: Redis | None = None,
) -> None:
    redis = client or redis_keys.get_client()
    payload = {
        "event": "STATE_UPDATED",
        "roomId": room_id,
        "version": version,
        "phase": phase.value if isinstance(phase, GamePhase) else phase,
    }
    await redis.publish(redis_keys.room_channel(room_id), json.dumps(payload))


class PubSubListener:
    """Listens to all `room:*` channels and dispatches into the local registry."""

    def __init__(self, pattern: str = "room:*") -> None:
        self._pattern = pattern
        self._task: asyncio.Task[None] | None = None
        self._stop_event: asyncio.Event | None = None

    async def start(self) -> None:
        if self._task is not None:
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run(), name="redis-pubsub-listener")

    async def stop(self) -> None:
        if self._task is None:
            return
        assert self._stop_event is not None
        self._stop_event.set()
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task
        self._task = None
        self._stop_event = None

    async def _run(self) -> None:
        client = redis_keys.get_client()
        pubsub = client.pubsub()
        await pubsub.psubscribe(self._pattern)
        try:
            assert self._stop_event is not None
            while not self._stop_event.is_set():
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message is None:
                    continue
                data = message.get("data")
                if not isinstance(data, str):
                    continue
                try:
                    payload = json.loads(data)
                    update = StateUpdate.from_payload(payload)
                except (json.JSONDecodeError, KeyError, ValueError):
                    log.warning("Malformed pubsub payload on %s", message.get("channel"))
                    continue
                await registry.dispatch(update)
        finally:
            await pubsub.punsubscribe(self._pattern)
            await pubsub.aclose()


listener = PubSubListener()
