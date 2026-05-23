from __future__ import annotations

from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis

from app.config import settings
from app.domain import resolve as domain_resolve
from app.domain import start_game as domain_start_game
from app.domain.game import GamePhase
from app.infrastructure import pubsub, rooms, timers
from app.infrastructure.adapters import (
    apply_game_state,
    clear_submissions,
    collect_submissions,
    room_to_game_state,
)
from app.infrastructure.errors import (
    AlreadySubmittedError,
    CardNotInHandError,
    InvalidPhaseError,
    NotEnoughPlayersError,
    NotHostError,
    NotSeatedError,
    RoomNotFoundError,
)
from app.infrastructure.locks import room_lock
from app.infrastructure.models import GameRoomState, PlayerInRoom

MIN_PLAYERS = 2


def _now() -> datetime:
    return datetime.now(UTC)


def _schedule_submit_deadline(room: GameRoomState) -> None:
    deadline = _now() + timedelta(seconds=settings.submit_timeout_seconds)
    room.submit_deadline = deadline
    timers.schedule_submit_deadline(room.id, deadline)


def _on_resolved(room: GameRoomState) -> None:
    if room.phase == GamePhase.SUBMIT:
        _schedule_submit_deadline(room)
    else:
        room.submit_deadline = None
        timers.cancel_submit_deadline(room.id)


async def _save_and_publish(room: GameRoomState, *, client: Redis | None = None) -> None:
    await rooms.save_room(room, client=client)
    await pubsub.publish_state_update(room.id, version=room.version, phase=room.phase)


async def start_game(
    *,
    room_id: str,
    guest_id: str,
    client: Redis | None = None,
) -> GameRoomState:
    async with room_lock(room_id):
        room = await rooms.load_room(room_id, client=client)
        if room is None:
            raise RoomNotFoundError(f"Room {room_id} not found")

        host_player = room.player_by_id(room.host_player_id)
        if host_player is None or host_player.guest_id != guest_id:
            raise NotHostError("Only the host can start the game")
        if room.phase != GamePhase.LOBBY:
            raise InvalidPhaseError("Game has already started")
        if len(room.players) < MIN_PLAYERS:
            raise NotEnoughPlayersError("Need at least 2 players to start")

        state = domain_start_game([player.id for player in room.players])
        apply_game_state(room, state)
        clear_submissions(room)
        _schedule_submit_deadline(room)

        await _save_and_publish(room, client=client)
        return room


def _validate_seated(room: GameRoomState, guest_id: str) -> PlayerInRoom:
    player = room.player_by_guest_id(guest_id)
    if player is None:
        raise NotSeatedError("Guest is not seated in this room")
    return player


def _card_in_hand(player: PlayerInRoom, card_id: str) -> bool:
    return any(card.id == card_id for card in player.hand)


async def _resolve_round(room: GameRoomState, *, client: Redis | None) -> None:
    submissions = collect_submissions(room)
    state = room_to_game_state(room)
    resolved_state = domain_resolve.resolve_turn(state, submissions)
    apply_game_state(room, resolved_state)
    clear_submissions(room)
    _on_resolved(room)


async def submit_card(
    *,
    room_id: str,
    guest_id: str,
    card_id: str,
    client: Redis | None = None,
) -> GameRoomState:
    async with room_lock(room_id):
        room = await rooms.load_room(room_id, client=client)
        if room is None:
            raise RoomNotFoundError(f"Room {room_id} not found")
        if room.phase != GamePhase.SUBMIT:
            raise InvalidPhaseError("Submissions are only accepted during the SUBMIT phase")

        player = _validate_seated(room, guest_id)
        if player.submission is not None:
            raise AlreadySubmittedError("Player has already submitted this round")
        if not _card_in_hand(player, card_id):
            raise CardNotInHandError("Card is not in the player's hand")

        player.submission = card_id

        active_ids = {p.id for p in room.players}
        submissions = {p.id: p.submission for p in room.players if p.submission}
        if active_ids == set(submissions.keys()):
            await _resolve_round(room, client=client)

        await _save_and_publish(room, client=client)
        return room


async def handle_submit_timeout(room_id: str) -> GameRoomState | None:
    """Auto-play the lowest-value card for any player who has not submitted."""
    async with room_lock(room_id):
        room = await rooms.load_room(room_id)
        if room is None or room.phase != GamePhase.SUBMIT:
            return room

        if room.submit_deadline is not None and room.submit_deadline > _now():
            return room

        for player in room.players:
            if player.submission is not None:
                continue
            if not player.hand:
                continue
            lowest = min(player.hand, key=lambda card: card.value)
            player.submission = lowest.id

        await _resolve_round(room, client=None)
        await _save_and_publish(room)
        return room


async def reconnect(
    *,
    room_id: str,
    guest_id: str,
    client: Redis | None = None,
) -> GameRoomState:
    timers.cancel_disconnect(room_id, guest_id)
    async with room_lock(room_id):
        room = await rooms.load_room(room_id, client=client)
        if room is None:
            raise RoomNotFoundError(f"Room {room_id} not found")
        player = _validate_seated(room, guest_id)
        if not player.is_connected:
            player.is_connected = True
            await _save_and_publish(room, client=client)
        return room


async def mark_disconnected(
    room_id: str,
    guest_id: str,
    *,
    client: Redis | None = None,
) -> GameRoomState | None:
    async with room_lock(room_id):
        room = await rooms.load_room(room_id, client=client)
        if room is None:
            return None
        player = room.player_by_guest_id(guest_id)
        if player is None or not player.is_connected:
            return room
        player.is_connected = False
        await _save_and_publish(room, client=client)
        return room
