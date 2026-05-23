from __future__ import annotations

from app.domain.cards import Card, Deck
from app.domain.game import GameState, PlayerState
from app.domain.resolve import ResolvedPlay
from app.domain.rows import Row
from app.infrastructure.models import CardDTO, GameRoomState, ResolvedPlayDTO, RowDTO


def _card_to_dto(card: Card) -> CardDTO:
    return CardDTO(id=card.id, value=card.value)


def _dto_to_card(dto: CardDTO) -> Card:
    return Card(id=dto.id, value=dto.value)


def _row_to_dto(row: Row) -> RowDTO:
    return RowDTO(cards=[_card_to_dto(card) for card in row.cards])


def _dto_to_row(dto: RowDTO) -> Row:
    return Row(cards=[_dto_to_card(card) for card in dto.cards])


def _resolved_play_to_dto(play: ResolvedPlay) -> ResolvedPlayDTO:
    return ResolvedPlayDTO(
        player_id=play.player_id,
        card=_card_to_dto(play.card),
        row_index=play.row_index,
        collected_row=play.collected_row,
        bones_collected=play.bones_taken,
    )


def room_to_game_state(room: GameRoomState) -> GameState:
    """Project the Redis room into a pure domain GameState for resolve_turn."""
    players = [
        PlayerState(
            id=player.id,
            hand=[_dto_to_card(card) for card in player.hand],
            bones_total=player.bones_total,
            is_active=True,
        )
        for player in room.players
    ]
    rows = [_dto_to_row(row) for row in room.rows]
    deck = Deck(cards=[_dto_to_card(card) for card in room.deck])

    return GameState(
        phase=room.phase,
        round_number=room.round_number,
        rows=rows,
        players=players,
        deck=deck,
        winner_ids=list(room.winner_ids) if room.winner_ids is not None else None,
    )


def apply_game_state(room: GameRoomState, state: GameState) -> GameRoomState:
    """Merge a fresh domain state back into the Redis room, preserving room metadata."""
    room.phase = state.phase
    room.round_number = state.round_number
    room.rows = [_row_to_dto(row) for row in state.rows]
    room.deck = [_card_to_dto(card) for card in state.deck.cards]
    room.winner_ids = list(state.winner_ids) if state.winner_ids is not None else None
    if state.last_resolution is not None:
        room.last_resolution = [_resolved_play_to_dto(play) for play in state.last_resolution]

    state_by_id = {player.id: player for player in state.players}
    for player in room.players:
        domain_player = state_by_id.get(player.id)
        if domain_player is None:
            continue
        player.hand = [_card_to_dto(card) for card in domain_player.hand]
        player.bones_total = domain_player.bones_total

    return room


def collect_submissions(room: GameRoomState) -> dict[str, str]:
    """Map player_id → submitted card_id for active players."""
    return {
        player.id: player.submission
        for player in room.players
        if player.submission is not None
    }


def clear_submissions(room: GameRoomState) -> None:
    for player in room.players:
        player.submission = None
