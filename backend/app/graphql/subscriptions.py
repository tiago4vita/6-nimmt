from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import strawberry
from strawberry.types import Info

from app.infrastructure import game as game_service
from app.infrastructure import pubsub
from app.infrastructure import rooms as room_service
from app.infrastructure import timers
from app.infrastructure.models import GameRoomState
from app.graphql.context import GraphQLContext
from app.graphql.types import GameRoomPublic, PlayerPrivateView
from app.graphql.views import build_private_view, build_public_room


async def _stream_state_updates(
    room_id: str,
) -> AsyncGenerator[tuple[pubsub.StateUpdate, GameRoomState | None], None]:
    """Yield a synthetic 'initial' update then forward every published STATE_UPDATED."""
    queue: asyncio.Queue[tuple[pubsub.StateUpdate, GameRoomState | None]] = asyncio.Queue()

    async def callback(
        update: pubsub.StateUpdate, room: GameRoomState | None
    ) -> None:
        await queue.put((update, room))

    pubsub.registry.register(room_id, callback)
    try:
        yield pubsub.StateUpdate(
            event="INITIAL", room_id=room_id, version=0, phase=""
        ), None
        while True:
            update, room = await queue.get()
            yield update, room
    finally:
        pubsub.registry.unregister(room_id, callback)


def _resolve_room_state(
    *,
    update: pubsub.StateUpdate,
    preloaded: GameRoomState | None,
    cached: GameRoomState,
) -> GameRoomState | None:
    if update.event == "INITIAL":
        return cached
    if preloaded is not None:
        return preloaded
    return None


@strawberry.type
class Subscription:
    @strawberry.subscription(
        description="Public room updates — same payload for all listeners."
    )
    async def game_room_updated(
        self, info: Info[GraphQLContext, None], room_id: strawberry.ID
    ) -> AsyncGenerator[GameRoomPublic, None]:
        guest = await info.context.require_guest()
        room_id_str = str(room_id)

        room = await room_service.load_room(room_id_str)
        if room is None or room.player_by_guest_id(guest.guest_id) is None:
            return

        async for update, preloaded in _stream_state_updates(room_id_str):
            current = _resolve_room_state(
                update=update, preloaded=preloaded, cached=room
            )
            if current is None:
                current = await room_service.load_room(room_id_str)
            if current is None:
                return
            if current.player_by_guest_id(guest.guest_id) is None:
                return
            room = current
            yield build_public_room(current)

    @strawberry.subscription(
        description="Private view for the authenticated guest — hand, submission, resolves."
    )
    async def my_game_view_updated(
        self, info: Info[GraphQLContext, None], room_id: strawberry.ID
    ) -> AsyncGenerator[PlayerPrivateView, None]:
        guest = await info.context.require_guest()
        room_id_str = str(room_id)

        room = await room_service.load_room(room_id_str)
        if room is None or room.player_by_guest_id(guest.guest_id) is None:
            return

        room = await game_service.reconnect(room_id=room_id_str, guest_id=guest.guest_id)
        try:
            async for update, preloaded in _stream_state_updates(room_id_str):
                current = _resolve_room_state(
                    update=update, preloaded=preloaded, cached=room
                )
                if current is None:
                    current = await room_service.load_room(room_id_str)
                if current is None:
                    return
                view = build_private_view(current, guest.guest_id)
                if view is None:
                    return
                room = current
                yield view
        finally:
            timers.schedule_disconnect(room_id_str, guest.guest_id)
