from __future__ import annotations

import pytest
from redis.asyncio import Redis

from app.config import settings
from app.domain.game import GamePhase
from app.infrastructure import game, rooms
from app.infrastructure.errors import (
    AlreadySubmittedError,
    CardNotInHandError,
    InvalidPhaseError,
    InvalidSubmitTimeoutError,
    NotEnoughPlayersError,
    NotHostError,
)
from app.infrastructure.models import GameRoomState

pytestmark = pytest.mark.asyncio


async def _seat_players(count: int) -> GameRoomState:
    settings.submit_timeout_seconds = 600
    host = await rooms.create_room(guest_id="g0", display_name="P0")
    for idx in range(1, count):
        await rooms.join_room(
            code=host.code, guest_id=f"g{idx}", display_name=f"P{idx}"
        )
    return await rooms.require_room(host.id)


async def _play_one_round(room_id: str) -> GameRoomState:
    """Each seated guest submits their first remaining card."""
    snapshot = await rooms.require_room(room_id)
    for player in snapshot.players:
        if not player.hand:
            return await rooms.require_room(room_id)
        fresh = await rooms.require_room(room_id)
        current = fresh.player_by_guest_id(player.guest_id)
        if current is None or not current.hand or current.submission is not None:
            continue
        await game.submit_card(
            room_id=room_id, guest_id=player.guest_id, card_id=current.hand[0].id
        )
    return await rooms.require_room(room_id)


async def test_start_game_requires_two_players(redis_client: Redis) -> None:
    room = await rooms.create_room(guest_id="solo", display_name="Solo")
    with pytest.raises(NotEnoughPlayersError):
        await game.start_game(room_id=room.id, guest_id="solo")


async def test_start_game_requires_host(redis_client: Redis) -> None:
    room = await _seat_players(2)
    with pytest.raises(NotHostError):
        await game.start_game(room_id=room.id, guest_id="g1")


async def test_start_game_deals_and_seeds(redis_client: Redis) -> None:
    room = await _seat_players(2)
    started = await game.start_game(room_id=room.id, guest_id="g0")

    assert started.phase == GamePhase.SUBMIT
    assert started.round_number == 1
    assert len(started.rows) == 4
    assert all(len(row.cards) == 1 for row in started.rows)
    for player in started.players:
        assert len(player.hand) == 10
    assert started.submit_deadline is not None


async def test_submit_requires_card_in_hand(redis_client: Redis) -> None:
    room = await _seat_players(2)
    started = await game.start_game(room_id=room.id, guest_id="g0")
    with pytest.raises(CardNotInHandError):
        await game.submit_card(room_id=started.id, guest_id="g0", card_id="cNOPE")


async def test_submit_rejects_double_submission(redis_client: Redis) -> None:
    room = await _seat_players(2)
    started = await game.start_game(room_id=room.id, guest_id="g0")
    first_card = started.players[0].hand[0].id

    await game.submit_card(room_id=room.id, guest_id="g0", card_id=first_card)
    with pytest.raises(AlreadySubmittedError):
        await game.submit_card(
            room_id=room.id,
            guest_id="g0",
            card_id=started.players[0].hand[1].id,
        )


async def test_submission_barrier_does_not_resolve_until_all_submit(
    redis_client: Redis,
) -> None:
    room = await _seat_players(2)
    started = await game.start_game(room_id=room.id, guest_id="g0")

    p0_card = started.players[0].hand[0].id

    mid = await game.submit_card(room_id=room.id, guest_id="g0", card_id=p0_card)

    assert mid.phase == GamePhase.SUBMIT
    assert mid.round_number == 1
    pending = mid.player_by_guest_id("g1")
    assert pending is not None
    assert pending.submission is None
    p0_after = mid.player_by_guest_id("g0")
    assert p0_after is not None and p0_after.submission == p0_card


async def test_full_two_player_game_reaches_finished(redis_client: Redis) -> None:
    room = await _seat_players(2)
    await game.start_game(room_id=room.id, guest_id="g0")

    for _ in range(15):
        state = await _play_one_round(room.id)
        if state.phase == GamePhase.FINISHED:
            break

    final = await rooms.require_room(room.id)
    assert final.phase == GamePhase.FINISHED
    assert final.winner_ids is not None
    assert len(final.winner_ids) >= 1
    for player in final.players:
        assert player.hand == []
    assert final.submit_deadline is None


async def test_update_submit_timeout_in_lobby(redis_client: Redis) -> None:
    room = await _seat_players(2)
    assert room.submit_timeout_seconds == 30

    updated = await rooms.update_submit_timeout(
        room_id=room.id,
        guest_id="g0",
        submit_timeout_seconds=45,
    )
    assert updated.submit_timeout_seconds == 45

    with pytest.raises(InvalidSubmitTimeoutError):
        await rooms.update_submit_timeout(
            room_id=room.id,
            guest_id="g0",
            submit_timeout_seconds=2,
        )

    with pytest.raises(NotHostError):
        await rooms.update_submit_timeout(
            room_id=room.id,
            guest_id="g1",
            submit_timeout_seconds=15,
        )


async def test_start_game_uses_room_submit_timeout(redis_client: Redis) -> None:
    room = await _seat_players(2)
    await rooms.update_submit_timeout(
        room_id=room.id,
        guest_id="g0",
        submit_timeout_seconds=12,
    )

    started = await game.start_game(room_id=room.id, guest_id="g0")
    assert started.submit_deadline is not None
    delta = started.submit_deadline - started.updated_at
    assert 11 <= delta.total_seconds() <= 13


async def test_return_to_lobby_from_finished(redis_client: Redis) -> None:
    room = await _seat_players(2)
    await game.start_game(room_id=room.id, guest_id="g0")

    for _ in range(15):
        state = await _play_one_round(room.id)
        if state.phase == GamePhase.FINISHED:
            break

    reset = await game.return_to_lobby(room_id=room.id, guest_id="g1")
    assert reset.phase == GamePhase.LOBBY
    assert reset.round_number == 0
    assert reset.winner_ids is None
    assert reset.rows == []
    for player in reset.players:
        assert player.hand == []
        assert player.bones_total == 0
        assert player.submission is None


async def test_cannot_submit_in_lobby(redis_client: Redis) -> None:
    host = await rooms.create_room(guest_id="g0", display_name="Host")
    with pytest.raises(InvalidPhaseError):
        await game.submit_card(room_id=host.id, guest_id="g0", card_id="anything")
