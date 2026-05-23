from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator

import strawberry
from strawberry.types import Info

from app.infrastructure import game as game_service
from app.infrastructure import pubsub
from app.infrastructure import rooms as room_service
from app.infrastructure import timers
from app.graphql.context import GraphQLContext
from app.graphql.types import GameRoomPublic, PlayerPrivateView
from app.graphql.views import build_private_view, build_public_room


async def _stream_state_updates(
    room_id: str,
) -> AsyncGenerator[pubsub.StateUpdate, None]:
    """Yield a synthetic 'initial' update then forward every published STATE_UPDATED."""
    queue: asyncio.Queue[pubsub.StateUpdate] = asyncio.Queue()

    async def callback(update: pubsub.StateUpdate) -> None:
        await queue.put(update)

    pubsub.registry.register(room_id, callback)
    try:
        yield pubsub.StateUpdate(
            event="INITIAL", room_id=room_id, version=0, phase=""
        )
        while True:
            update = await queue.get()
            yield update
    finally:
        pubsub.registry.unregister(room_id, callback)


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

        async for _ in _stream_state_updates(room_id_str):
            current = await room_service.load_room(room_id_str)
            if current is None:
                return
            if current.player_by_guest_id(guest.guest_id) is None:
                return
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

        await game_service.reconnect(room_id=room_id_str, guest_id=guest.guest_id)
        try:
            async for _ in _stream_state_updates(room_id_str):
                current = await room_service.load_room(room_id_str)
                if current is None:
                    return
                view = build_private_view(current, guest.guest_id)
                if view is None:
                    return
                yield view
        finally:
            timers.schedule_disconnect(room_id_str, guest.guest_id)
