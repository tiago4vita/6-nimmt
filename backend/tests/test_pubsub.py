from __future__ import annotations

import asyncio

import pytest
from redis.asyncio import Redis

from app.infrastructure import pubsub, rooms

pytestmark = pytest.mark.asyncio


async def test_publish_dispatches_to_subscriber(redis_client: Redis) -> None:
    received: list[pubsub.StateUpdate] = []

    async def callback(update: pubsub.StateUpdate) -> None:
        received.append(update)

    listener = pubsub.PubSubListener()
    pubsub.registry.clear()
    await listener.start()
    try:
        host = await rooms.create_room(guest_id="host", display_name="Host")
        pubsub.registry.register(host.id, callback)

        await rooms.join_room(code=host.code, guest_id="g2", display_name="Bob")

        for _ in range(20):
            if received:
                break
            await asyncio.sleep(0.1)
    finally:
        pubsub.registry.unregister(host.id, callback)
        await listener.stop()
        pubsub.registry.clear()

    assert received, "expected at least one STATE_UPDATED event"
    assert received[-1].room_id == host.id
    assert received[-1].event == "STATE_UPDATED"
