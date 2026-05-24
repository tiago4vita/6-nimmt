from __future__ import annotations

from datetime import datetime

import strawberry

from app.domain.cards import bones as bones_for_value
from app.domain.game import GamePhase as DomainGamePhase
from app.graphql.errors import GameErrorCode


GamePhase = strawberry.enum(DomainGamePhase, name="GamePhase")


@strawberry.type
class Card:
    id: strawberry.ID
    value: int

    @strawberry.field
    def bones(self) -> int:
        return bones_for_value(self.value)


@strawberry.type
class Row:
    index: int
    cards: list[Card]


@strawberry.type
class SubmissionProgress:
    submitted: int
    required: int


@strawberry.type
class PlayerPublic:
    id: strawberry.ID
    display_name: str
    bones_total: int
    cards_in_hand: int
    has_submitted: bool
    is_connected: bool
    is_host: bool


@strawberry.type
class GameRoomPublic:
    id: strawberry.ID
    code: str
    phase: GamePhase  # type: ignore[valid-type]
    round_number: int
    rows: list[Row]
    players: list[PlayerPublic]
    submission_progress: SubmissionProgress
    submit_deadline: datetime | None
    submit_timeout_seconds: int
    winner_ids: list[strawberry.ID] | None
    updated_at: datetime


@strawberry.type
class ResolvedPlay:
    player_id: strawberry.ID
    card: Card
    row_index: int | None
    bones_taken: int


@strawberry.type
class PlayerPrivateView:
    room: GameRoomPublic
    my_player_id: strawberry.ID
    my_hand: list[Card]
    my_submitted_card: Card | None
    last_resolved_plays: list[ResolvedPlay]


@strawberry.type
class GuestSession:
    guest_id: strawberry.ID
    session_token: str
    expires_at: datetime


@strawberry.type
class GameError:
    code: GameErrorCode  # type: ignore[valid-type]
    message: str


@strawberry.type
class MutationResult:
    success: bool
    errors: list[GameError]
    view: PlayerPrivateView | None = None
