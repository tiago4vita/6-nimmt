from __future__ import annotations

import strawberry
from strawberry.types import Info

from app.infrastructure import game as game_service
from app.infrastructure import rooms as room_service
from app.infrastructure import sessions as session_service
from app.infrastructure.errors import InfrastructureError
from app.infrastructure.models import GameRoomState
from app.graphql.context import GraphQLContext
from app.graphql.errors import GameErrorCode, map_infrastructure_error
from app.graphql.types import (
    GameError,
    GameRoomPublic,
    GuestSession,
    MutationResult,
    PlayerPrivateView,
)
from app.graphql.views import build_private_view, build_public_room


def _failure(code: GameErrorCode, message: str) -> MutationResult:
    return MutationResult(
        success=False, errors=[GameError(code=code, message=message)], view=None
    )


def _failure_from_exception(exc: InfrastructureError) -> MutationResult:
    return _failure(map_infrastructure_error(exc), str(exc))


def _success(view: PlayerPrivateView | None) -> MutationResult:
    return MutationResult(success=True, errors=[], view=view)


def _private_or_none(room: GameRoomState | None, guest_id: str) -> PlayerPrivateView | None:
    if room is None:
        return None
    return build_private_view(room, guest_id)


async def _require_guest(info: Info[GraphQLContext, None]) -> str:
    guest = await info.context.require_guest()
    return guest.guest_id


@strawberry.type
class Query:
    @strawberry.field(description="Health check for Docker / portfolio demo.")
    def health(self) -> str:
        return "ok"

    @strawberry.field(
        description="Mint or refresh the anonymous guest session for this browser."
    )
    async def ensure_guest_session(
        self, info: Info[GraphQLContext, None]
    ) -> GuestSession:
        context = info.context
        token, guest_id = context._collect_credentials()
        result = await session_service.ensure_guest_session(
            existing_guest_id=guest_id, existing_token=token
        )
        return GuestSession(
            guest_id=strawberry.ID(result.guest_id),
            session_token=result.session_token,
            expires_at=result.expires_at,
        )

    @strawberry.field(description="Fetch room by join code (public view only).")
    async def room_by_code(
        self, info: Info[GraphQLContext, None], code: str
    ) -> GameRoomPublic | None:
        await _require_guest(info)
        room = await room_service.get_room_by_code(code)
        if room is None:
            return None
        return build_public_room(room)

    @strawberry.field(description="Full private view for the calling guest in a room.")
    async def my_game_view(
        self, info: Info[GraphQLContext, None], room_id: strawberry.ID
    ) -> PlayerPrivateView | None:
        guest_id = await _require_guest(info)
        room = await room_service.load_room(str(room_id))
        if room is None:
            return None
        return build_private_view(room, guest_id)


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def create_room(
        self,
        info: Info[GraphQLContext, None],
        display_name: str,
        max_players: int = 10,
    ) -> MutationResult:
        guest_id = await _require_guest(info)
        try:
            room = await room_service.create_room(
                guest_id=guest_id,
                display_name=display_name,
                max_players=max_players,
            )
        except InfrastructureError as exc:
            return _failure_from_exception(exc)
        return _success(_private_or_none(room, guest_id))

    @strawberry.mutation
    async def join_room(
        self, info: Info[GraphQLContext, None], code: str, display_name: str
    ) -> MutationResult:
        guest_id = await _require_guest(info)
        try:
            room = await room_service.join_room(
                code=code, guest_id=guest_id, display_name=display_name
            )
        except InfrastructureError as exc:
            return _failure_from_exception(exc)
        return _success(_private_or_none(room, guest_id))

    @strawberry.mutation
    async def leave_room(
        self, info: Info[GraphQLContext, None], room_id: strawberry.ID
    ) -> MutationResult:
        guest_id = await _require_guest(info)
        try:
            room = await room_service.leave_room(room_id=str(room_id), guest_id=guest_id)
        except InfrastructureError as exc:
            return _failure_from_exception(exc)
        return _success(_private_or_none(room, guest_id))

    @strawberry.mutation
    async def start_game(
        self, info: Info[GraphQLContext, None], room_id: strawberry.ID
    ) -> MutationResult:
        guest_id = await _require_guest(info)
        try:
            room = await game_service.start_game(room_id=str(room_id), guest_id=guest_id)
        except InfrastructureError as exc:
            return _failure_from_exception(exc)
        return _success(_private_or_none(room, guest_id))

    @strawberry.mutation
    async def submit_card(
        self,
        info: Info[GraphQLContext, None],
        room_id: strawberry.ID,
        card_id: strawberry.ID,
    ) -> MutationResult:
        guest_id = await _require_guest(info)
        try:
            room = await game_service.submit_card(
                room_id=str(room_id), guest_id=guest_id, card_id=str(card_id)
            )
        except InfrastructureError as exc:
            return _failure_from_exception(exc)
        return _success(_private_or_none(room, guest_id))

    @strawberry.mutation
    async def update_display_name(
        self, info: Info[GraphQLContext, None], display_name: str
    ) -> MutationResult:
        guest_id = await _require_guest(info)
        try:
            cleaned = room_service.validate_display_name(display_name)
        except InfrastructureError as exc:
            return _failure_from_exception(exc)
        session = await session_service.update_display_name(guest_id, cleaned)
        if session is None:
            return _failure(GameErrorCode.SESSION_EXPIRED, "Session expired")
        return _success(None)
