from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from redis.asyncio import Redis

from app.domain.game import GamePhase
from app.infrastructure import redis as redis_keys, rooms
from app.infrastructure.errors import (
    InvalidDisplayNameError,
    InvalidPhaseError,
    NotSeatedError,
    RoomFullError,
    RoomNotFoundError,
)

pytestmark = pytest.mark.asyncio


async def test_create_room_assigns_host_and_code(redis_client: Redis) -> None:
    room = await rooms.create_room(guest_id="g1", display_name="Alice")

    assert room.phase == GamePhase.LOBBY
    assert len(room.code) == rooms.CODE_LENGTH
    assert room.host_player_id == room.players[0].id
    assert room.players[0].display_name == "Alice"

    stored = await rooms.get_room_by_code(room.code)
    assert stored is not None
    assert stored.id == room.id


async def test_create_room_rejects_blank_name(redis_client: Redis) -> None:
    with pytest.raises(InvalidDisplayNameError):
        await rooms.create_room(guest_id="g1", display_name="   ")


async def test_join_room_adds_player(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    joined = await rooms.join_room(
        code=host_room.code, guest_id="g2", display_name="Bob"
    )

    assert len(joined.players) == 2
    assert joined.players[1].guest_id == "g2"
    assert joined.players[1].is_connected is True
    assert joined.version > host_room.version


async def test_join_room_rejects_unknown_code(redis_client: Redis) -> None:
    with pytest.raises(RoomNotFoundError):
        await rooms.join_room(code="ZZZZZZ", guest_id="g1", display_name="Alice")


async def test_join_room_is_idempotent_for_same_guest(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    again = await rooms.join_room(
        code=host_room.code, guest_id="host", display_name="Host"
    )

    assert len(again.players) == 1
    assert again.id == host_room.id


async def test_join_room_rejects_full_room(redis_client: Redis) -> None:
    host_room = await rooms.create_room(
        guest_id="host", display_name="Host", max_players=2
    )
    await rooms.join_room(code=host_room.code, guest_id="g2", display_name="Bob")

    with pytest.raises(RoomFullError):
        await rooms.join_room(
            code=host_room.code, guest_id="g3", display_name="Cara"
        )


async def test_leave_room_in_lobby_removes_player(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    await rooms.join_room(code=host_room.code, guest_id="g2", display_name="Bob")

    result = await rooms.leave_room(room_id=host_room.id, guest_id="g2")

    assert result is not None
    assert len(result.players) == 1


async def test_leave_room_transfers_host(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    await rooms.join_room(code=host_room.code, guest_id="g2", display_name="Bob")

    result = await rooms.leave_room(room_id=host_room.id, guest_id="host")

    assert result is not None
    assert result.host_player_id == result.players[0].id
    assert result.players[0].guest_id == "g2"


async def test_leave_last_player_deletes_room(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    result = await rooms.leave_room(room_id=host_room.id, guest_id="host")
    assert result is None

    assert await rooms.load_room(host_room.id) is None
    assert await rooms.get_room_by_code(host_room.code) is None


async def test_leave_room_in_active_marks_disconnected(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    await rooms.join_room(code=host_room.code, guest_id="g2", display_name="Bob")

    fresh = await rooms.require_room(host_room.id)
    fresh.phase = GamePhase.SUBMIT
    await redis_keys.set_json(
        redis_keys.room_key(fresh.id), fresh.model_dump(mode="json"), ttl_seconds=3600
    )

    result = await rooms.leave_room(room_id=host_room.id, guest_id="g2")

    assert result is not None
    assert result.phase == GamePhase.SUBMIT
    bob = result.player_by_guest_id("g2")
    assert bob is not None
    assert bob.is_connected is False


async def test_join_rejects_active_room(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    fresh = await rooms.require_room(host_room.id)
    fresh.phase = GamePhase.SUBMIT
    await redis_keys.set_json(
        redis_keys.room_key(fresh.id), fresh.model_dump(mode="json"), ttl_seconds=3600
    )

    with pytest.raises(InvalidPhaseError):
        await rooms.join_room(code=host_room.code, guest_id="g2", display_name="Bob")


async def test_join_cleans_up_stale_lobby(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    fresh = await rooms.require_room(host_room.id)
    fresh.updated_at = datetime.now(UTC) - timedelta(hours=3)
    await redis_keys.set_json(
        redis_keys.room_key(fresh.id), fresh.model_dump(mode="json"), ttl_seconds=3600
    )

    with pytest.raises(RoomNotFoundError):
        await rooms.join_room(code=host_room.code, guest_id="g2", display_name="Bob")

    assert await rooms.load_room(host_room.id) is None


async def test_leave_unseated_raises(redis_client: Redis) -> None:
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    with pytest.raises(NotSeatedError):
        await rooms.leave_room(room_id=host_room.id, guest_id="not-a-player")
