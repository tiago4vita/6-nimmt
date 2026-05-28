from __future__ import annotations

import asyncio

import pytest
from redis.asyncio import Redis

from app.domain.game import AFK_FORFEIT_ROUNDS, GameFinishReason, GamePhase
from app.infrastructure import game, rooms

pytestmark = pytest.mark.asyncio


async def _start_duel(timeout_seconds: int = 3):
    host_room = await rooms.create_room(guest_id="host", display_name="Host")
    await rooms.join_room(code=host_room.code, guest_id="guest", display_name="Bob")
    await rooms.update_submit_timeout(
        room_id=host_room.id,
        guest_id="host",
        submit_timeout_seconds=timeout_seconds,
    )
    return await game.start_game(room_id=host_room.id, guest_id="host")


async def _host_submits_lowest(room_id: str) -> None:
    room = await rooms.require_room(room_id)
    host = room.player_by_guest_id("host")
    assert host is not None
    lowest = min(host.hand, key=lambda card: card.value)
    await game.submit_card(room_id=room_id, guest_id="host", card_id=lowest.id)


async def test_leave_mid_game_grants_walkover_to_remaining_player(
    redis_client: Redis,
) -> None:
    room = await _start_duel(timeout_seconds=30)

    result = await rooms.leave_room(room_id=room.id, guest_id="guest")

    assert result is not None
    assert result.phase == GamePhase.FINISHED
    assert result.finish_reason == GameFinishReason.WALKOVER_LEAVE
    guest = result.player_by_guest_id("guest")
    assert guest is not None
    assert result.forfeited_player_ids == [guest.id]
    host = result.player_by_guest_id("host")
    assert host is not None
    assert result.winner_ids == [host.id]


async def test_three_consecutive_auto_submits_forfeits_afk_player(
    redis_client: Redis,
) -> None:
    room = await _start_duel(timeout_seconds=3)
    guest = room.player_by_guest_id("guest")
    assert guest is not None

    for round_index in range(AFK_FORFEIT_ROUNDS):
        await _host_submits_lowest(room.id)
        await asyncio.sleep(3.5)
        fresh = await rooms.require_room(room.id)
        guest_player = fresh.player_by_guest_id("guest")
        assert guest_player is not None
        if round_index < AFK_FORFEIT_ROUNDS - 1:
            assert fresh.phase == GamePhase.SUBMIT
            assert guest_player.consecutive_auto_submit_rounds == round_index + 1
            continue

        assert fresh.phase == GamePhase.FINISHED
        assert fresh.finish_reason == GameFinishReason.WALKOVER_AFK
        assert fresh.forfeited_player_ids == [guest_player.id]
        host = fresh.player_by_guest_id("host")
        assert host is not None
        assert fresh.winner_ids == [host.id]


async def test_manual_submit_resets_afk_streak(redis_client: Redis) -> None:
    room = await _start_duel(timeout_seconds=3)

    for _ in range(2):
        await _host_submits_lowest(room.id)
        await asyncio.sleep(3.5)

    guest_room = await rooms.require_room(room.id)
    guest = guest_room.player_by_guest_id("guest")
    assert guest is not None
    assert guest.consecutive_auto_submit_rounds == 2

    lowest = min(guest.hand, key=lambda card: card.value)
    await game.submit_card(room_id=room.id, guest_id="guest", card_id=lowest.id)
    await _host_submits_lowest(room.id)

    fresh = await rooms.require_room(room.id)
    guest_player = fresh.player_by_guest_id("guest")
    assert guest_player is not None
    assert guest_player.consecutive_auto_submit_rounds == 0
    assert fresh.phase == GamePhase.SUBMIT
