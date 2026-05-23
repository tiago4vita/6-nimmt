from __future__ import annotations

import re
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from redis.asyncio import Redis

from app.config import settings
from app.domain.game import GamePhase
from app.infrastructure import pubsub
from app.infrastructure import redis as redis_keys
from app.infrastructure.errors import (
    GameAlreadyStartedError,
    InvalidDisplayNameError,
    NotSeatedError,
    RoomCodeCollisionError,
    RoomFullError,
    RoomNotFoundError,
)
from app.infrastructure.locks import drop_room_lock, room_lock
from app.infrastructure.models import GameRoomState, PlayerInRoom

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 6
MAX_CODE_RETRIES = 16
DISPLAY_NAME_PATTERN = re.compile(r"^[A-Za-z0-9 _\-]{1,32}$")


def _now() -> datetime:
    return datetime.now(UTC)


def _room_ttl_seconds() -> int:
    return settings.room_ttl_hours * 60 * 60


def validate_display_name(name: str) -> str:
    cleaned = name.strip()
    if not cleaned or not DISPLAY_NAME_PATTERN.match(cleaned):
        raise InvalidDisplayNameError(
            "Display name must be 1-32 alphanumeric/space/_/- characters"
        )
    return cleaned


def _generate_code() -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


async def save_room(room: GameRoomState, *, client: Redis | None = None) -> None:
    """Persist a room, bumping version and refreshing TTLs. Caller holds room_lock."""
    redis = client or redis_keys.get_client()
    room.updated_at = _now()
    room.version += 1
    await redis_keys.set_json(
        redis_keys.room_key(room.id),
        room.model_dump(mode="json"),
        ttl_seconds=_room_ttl_seconds(),
        client=redis,
    )
    await redis.expire(redis_keys.room_code_key(room.code), _room_ttl_seconds())


async def _publish_room(room: GameRoomState) -> None:
    await pubsub.publish_state_update(
        room.id, version=room.version, phase=room.phase
    )


async def load_room(room_id: str, *, client: Redis | None = None) -> GameRoomState | None:
    payload = await redis_keys.get_json(redis_keys.room_key(room_id), client=client)
    if payload is None:
        return None
    return GameRoomState.model_validate(payload)


async def require_room(room_id: str, *, client: Redis | None = None) -> GameRoomState:
    room = await load_room(room_id, client=client)
    if room is None:
        raise RoomNotFoundError(f"Room {room_id} not found")
    return room


async def get_room_by_code(code: str, *, client: Redis | None = None) -> GameRoomState | None:
    redis = client or redis_keys.get_client()
    room_id = await redis.get(redis_keys.room_code_key(code.upper()))
    if room_id is None:
        return None
    return await load_room(room_id, client=client)


async def _delete_room(room: GameRoomState, *, client: Redis | None = None) -> None:
    redis = client or redis_keys.get_client()
    pipe = redis.pipeline()
    pipe.delete(redis_keys.room_key(room.id))
    pipe.delete(redis_keys.room_code_key(room.code))
    for player in room.players:
        pipe.delete(redis_keys.guest_current_room_key(player.guest_id))
    await pipe.execute()
    drop_room_lock(room.id)


async def _is_stale_lobby(room: GameRoomState) -> bool:
    if room.phase != GamePhase.LOBBY:
        return False
    cutoff = _now() - timedelta(hours=settings.lobby_stale_hours)
    return room.updated_at < cutoff


async def create_room(
    *,
    guest_id: str,
    display_name: str,
    max_players: int = 10,
    client: Redis | None = None,
) -> GameRoomState:
    cleaned_name = validate_display_name(display_name)
    redis = client or redis_keys.get_client()

    code: str | None = None
    for _ in range(MAX_CODE_RETRIES):
        candidate = _generate_code()
        reserved = await redis.set(
            redis_keys.room_code_key(candidate),
            "pending",
            nx=True,
            ex=_room_ttl_seconds(),
        )
        if reserved:
            code = candidate
            break
    if code is None:
        raise RoomCodeCollisionError("Could not allocate a unique room code")

    room_id = str(uuid4())
    player_id = str(uuid4())
    now = _now()
    host = PlayerInRoom(
        id=player_id,
        guest_id=guest_id,
        display_name=cleaned_name,
        is_connected=True,
    )
    room = GameRoomState(
        id=room_id,
        code=code,
        phase=GamePhase.LOBBY,
        host_player_id=player_id,
        max_players=max_players,
        created_at=now,
        updated_at=now,
        players=[host],
    )

    async with room_lock(room_id):
        await save_room(room, client=client)
        await redis.set(redis_keys.room_code_key(code), room_id, ex=_room_ttl_seconds())
        await redis.set(
            redis_keys.guest_current_room_key(guest_id),
            room_id,
            ex=_room_ttl_seconds(),
        )

    await _publish_room(room)
    return room


async def join_room(
    *,
    code: str,
    guest_id: str,
    display_name: str,
    client: Redis | None = None,
) -> GameRoomState:
    cleaned_name = validate_display_name(display_name)
    redis = client or redis_keys.get_client()

    room = await get_room_by_code(code.upper(), client=client)
    if room is None:
        raise RoomNotFoundError("Room code not found")

    if await _is_stale_lobby(room):
        await _delete_room(room, client=client)
        raise RoomNotFoundError("Room expired before join")

    async with room_lock(room.id):
        fresh = await require_room(room.id, client=client)

        existing = fresh.player_by_guest_id(guest_id)
        if existing is not None:
            existing.is_connected = True
            existing.display_name = cleaned_name
            await save_room(fresh, client=client)
            await redis.set(
                redis_keys.guest_current_room_key(guest_id),
                fresh.id,
                ex=_room_ttl_seconds(),
            )
            await _publish_room(fresh)
            return fresh

        if fresh.phase != GamePhase.LOBBY:
            raise GameAlreadyStartedError("Cannot join a room that is no longer in lobby")
        if len(fresh.players) >= fresh.max_players:
            raise RoomFullError("Room is full")

        fresh.players.append(
            PlayerInRoom(
                id=str(uuid4()),
                guest_id=guest_id,
                display_name=cleaned_name,
                is_connected=True,
            )
        )
        await save_room(fresh, client=client)
        await redis.set(
            redis_keys.guest_current_room_key(guest_id),
            fresh.id,
            ex=_room_ttl_seconds(),
        )

    await _publish_room(fresh)
    return fresh


async def update_seated_display_name(
    *,
    guest_id: str,
    display_name: str,
    client: Redis | None = None,
) -> GameRoomState | None:
    """Update the seated player's display name in their current room, if any."""
    cleaned = validate_display_name(display_name)
    redis = client or redis_keys.get_client()
    room_id = await redis.get(redis_keys.guest_current_room_key(guest_id))
    if room_id is None:
        return None

    async with room_lock(room_id):
        room = await load_room(room_id, client=client)
        if room is None:
            return None
        player = room.player_by_guest_id(guest_id)
        if player is None:
            return None
        player.display_name = cleaned
        await save_room(room, client=client)

    await _publish_room(room)
    return room


async def leave_room(
    *,
    room_id: str,
    guest_id: str,
    client: Redis | None = None,
) -> GameRoomState | None:
    redis = client or redis_keys.get_client()

    async with room_lock(room_id):
        room = await load_room(room_id, client=client)
        if room is None:
            raise RoomNotFoundError(f"Room {room_id} not found")

        player = room.player_by_guest_id(guest_id)
        if player is None:
            raise NotSeatedError("Guest is not seated in this room")

        if room.phase == GamePhase.LOBBY:
            room.players = [p for p in room.players if p.guest_id != guest_id]
            await redis.delete(redis_keys.guest_current_room_key(guest_id))

            if not room.players:
                await _delete_room(room, client=client)
                return None

            if room.host_player_id == player.id:
                room.host_player_id = room.players[0].id

            await save_room(room, client=client)
            await _publish_room(room)
            return room

        player.is_connected = False
        await save_room(room, client=client)
        await _publish_room(room)
        return room
