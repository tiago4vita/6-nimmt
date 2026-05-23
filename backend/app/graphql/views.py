from __future__ import annotations

import strawberry

from app.domain.game import GamePhase as DomainGamePhase
from app.graphql.types import (
    Card,
    GameRoomPublic,
    PlayerPrivateView,
    PlayerPublic,
    ResolvedPlay,
    Row,
    SubmissionProgress,
)
from app.infrastructure.models import CardDTO, GameRoomState


def _card_view(card: CardDTO) -> Card:
    return Card(id=strawberry.ID(card.id), value=card.value)


def build_public_room(room: GameRoomState) -> GameRoomPublic:
    """Public projection — strips hands, submitted cards, and the remaining deck."""
    rows = [
        Row(index=idx, cards=[_card_view(card) for card in row.cards])
        for idx, row in enumerate(room.rows)
    ]
    players = [
        PlayerPublic(
            id=strawberry.ID(player.id),
            display_name=player.display_name,
            bones_total=player.bones_total,
            cards_in_hand=len(player.hand),
            has_submitted=player.submission is not None,
            is_connected=player.is_connected,
            is_host=player.id == room.host_player_id,
        )
        for player in room.players
    ]

    if room.phase == DomainGamePhase.SUBMIT:
        required = len(room.players)
        submitted = sum(1 for player in room.players if player.submission is not None)
    else:
        required = 0
        submitted = 0

    return GameRoomPublic(
        id=strawberry.ID(room.id),
        code=room.code,
        phase=room.phase,
        round_number=room.round_number,
        rows=rows,
        players=players,
        submission_progress=SubmissionProgress(submitted=submitted, required=required),
        winner_ids=(
            [strawberry.ID(player_id) for player_id in room.winner_ids]
            if room.winner_ids is not None
            else None
        ),
        updated_at=room.updated_at,
    )


def build_private_view(room: GameRoomState, guest_id: str) -> PlayerPrivateView | None:
    """Build the per-guest view. Returns None if the guest is not seated in the room."""
    seat = room.player_by_guest_id(guest_id)
    if seat is None:
        return None

    submitted_card: Card | None = None
    if room.phase == DomainGamePhase.SUBMIT and seat.submission is not None:
        for card in seat.hand:
            if card.id == seat.submission:
                submitted_card = _card_view(card)
                break

    resolved: list[ResolvedPlay] = []
    if room.last_resolution:
        resolved = [
            ResolvedPlay(
                player_id=strawberry.ID(play.player_id),
                card=_card_view(play.card),
                row_index=play.row_index,
                bones_taken=play.bones_collected,
            )
            for play in room.last_resolution
        ]

    return PlayerPrivateView(
        room=build_public_room(room),
        my_player_id=strawberry.ID(seat.id),
        my_hand=[_card_view(card) for card in seat.hand],
        my_submitted_card=submitted_card,
        last_resolved_plays=resolved,
    )
