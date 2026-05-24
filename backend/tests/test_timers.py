from __future__ import annotations

import asyncio

import pytest
from redis.asyncio import Redis

from app.config import settings
from app.domain.game import GamePhase
from app.infrastructure import game, rooms, timers
from app.infrastructure.models import GameRoomState

pytestmark = pytest.mark.asyncio


async def _seat_two_and_start(timeout_seconds: int) -> GameRoomState:
    host = await rooms.create_room(guest_id="host", display_name="Host")
    await rooms.join_room(code=host.code, guest_id="guest", display_name="Bob")
    await rooms.update_submit_timeout(
        room_id=host.id,
        guest_id="host",
        submit_timeout_seconds=timeout_seconds,
    )
    return await game.start_game(room_id=host.id, guest_id="host")


async def test_submit_timeout_auto_resolves_round(redis_client: Redis) -> None:
    room = await _seat_two_and_start(timeout_seconds=3)
    assert room.phase == GamePhase.SUBMIT
    assert room.round_number == 1
    original_round = room.round_number

    await asyncio.sleep(3.5)

    fresh = await rooms.require_room(room.id)
    assert fresh.round_number == original_round + 1 or fresh.phase == GamePhase.FINISHED
    for player in fresh.players:
        assert player.submission is None


async def test_disconnect_grace_marks_disconnected(redis_client: Redis) -> None:
    original_grace = settings.disconnect_grace_seconds
    settings.disconnect_grace_seconds = 1
    settings.submit_timeout_seconds = 60
    try:
        host = await rooms.create_room(guest_id="host", display_name="Host")
        await rooms.join_room(code=host.code, guest_id="guest", display_name="Bob")

        timers.schedule_disconnect(host.id, "guest")
        await asyncio.sleep(1.3)

        fresh = await rooms.require_room(host.id)
        guest_player = fresh.player_by_guest_id("guest")
        assert guest_player is not None
        assert guest_player.is_connected is False
    finally:
        settings.disconnect_grace_seconds = original_grace


async def test_reconnect_cancels_pending_disconnect(redis_client: Redis) -> None:
    original_grace = settings.disconnect_grace_seconds
    settings.disconnect_grace_seconds = 2
    settings.submit_timeout_seconds = 60
    try:
        host = await rooms.create_room(guest_id="host", display_name="Host")
        await rooms.join_room(code=host.code, guest_id="guest", display_name="Bob")

        timers.schedule_disconnect(host.id, "guest")
        await asyncio.sleep(0.2)
        await game.reconnect(room_id=host.id, guest_id="guest")
        await asyncio.sleep(2.2)

        fresh = await rooms.require_room(host.id)
        guest_player = fresh.player_by_guest_id("guest")
        assert guest_player is not None
        assert guest_player.is_connected is True
    finally:
        settings.disconnect_grace_seconds = original_grace
