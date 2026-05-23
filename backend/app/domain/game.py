from __future__ import annotations

import random
from dataclasses import dataclass, field, replace
from enum import Enum
from typing import TYPE_CHECKING

from app.domain.cards import Card, Deck
from app.domain.rows import Row, row_bones
from app.domain.scoring import winner_ids

if TYPE_CHECKING:
    from app.domain.resolve import ResolvedPlay

PlayerId = str


class GamePhase(str, Enum):
    LOBBY = "LOBBY"
    DEAL = "DEAL"
    SUBMIT = "SUBMIT"
    RESOLVE = "RESOLVE"
    SCORE = "SCORE"
    FINISHED = "FINISHED"


DEAL_TABLE: dict[int, tuple[int, int]] = {
    2: (10, 10),
    3: (9, 9),
    4: (8, 8),
    5: (7, 7),
    6: (6, 6),
    7: (5, 5),
    8: (4, 4),
    9: (3, 3),
    10: (2, 2),
}


def deal_config(player_count: int) -> tuple[int, int]:
    """Return (cards_per_hand, rounds) for the given player count."""
    if player_count not in DEAL_TABLE:
        msg = f"Player count must be between 2 and 10, got {player_count}"
        raise ValueError(msg)
    return DEAL_TABLE[player_count]


@dataclass
class PlayerState:
    id: PlayerId
    hand: list[Card] = field(default_factory=list)
    bones_total: int = 0
    is_active: bool = True

    def copy(self) -> PlayerState:
        return replace(self, hand=list(self.hand))


@dataclass
class GameState:
    phase: GamePhase = GamePhase.LOBBY
    round_number: int = 0
    rows: list[Row] = field(default_factory=list)
    players: list[PlayerState] = field(default_factory=list)
    deck: Deck = field(default_factory=Deck.standard)
    winner_ids: list[PlayerId] | None = None
    last_resolution: list[ResolvedPlay] | None = None

    @property
    def cards_per_hand(self) -> int:
        cards_per_hand, _ = deal_config(len(self.players))
        return cards_per_hand

    @property
    def total_rounds(self) -> int:
        _, rounds = deal_config(len(self.players))
        return rounds

    @property
    def active_player_ids(self) -> list[PlayerId]:
        return [player.id for player in self.players if player.is_active]

    def player_by_id(self, player_id: PlayerId) -> PlayerState:
        for player in self.players:
            if player.id == player_id:
                return player
        msg = f"Unknown player id: {player_id}"
        raise KeyError(msg)

    def copy(self) -> GameState:
        return GameState(
            phase=self.phase,
            round_number=self.round_number,
            rows=[Row(cards=list(row.cards)) for row in self.rows],
            players=[player.copy() for player in self.players],
            deck=Deck(cards=list(self.deck.cards)),
            winner_ids=list(self.winner_ids) if self.winner_ids is not None else None,
            last_resolution=list(self.last_resolution) if self.last_resolution is not None else None,
        )

    def hand_card_value(self, player_id: PlayerId, card_id: str) -> int:
        player = self.player_by_id(player_id)
        for card in player.hand:
            if card.id == card_id:
                return card.value
        msg = f"Card {card_id} not in hand of player {player_id}"
        raise KeyError(msg)

    def remove_from_hand(self, player_id: PlayerId, card_id: str) -> Card:
        player = self.player_by_id(player_id)
        for idx, card in enumerate(player.hand):
            if card.id == card_id:
                return player.hand.pop(idx)
        msg = f"Card {card_id} not in hand of player {player_id}"
        raise KeyError(msg)

    def collect_row(self, player_id: PlayerId, row_idx: int) -> None:
        player = self.player_by_id(player_id)
        row = self.rows[row_idx]
        player.bones_total += row_bones(row)


def seed_rows(deck: Deck) -> list[Row]:
    """Draw one card per row to initialize the board."""
    drawn = deck.draw(4)
    return [Row(cards=[card]) for card in drawn]


def start_game(
    player_ids: list[PlayerId],
    *,
    deck: Deck | None = None,
    rng: random.Random | None = None,
) -> GameState:
    """Shuffle, deal hands, seed four rows, and enter SUBMIT phase."""
    if len(player_ids) < 2 or len(player_ids) > 10:
        msg = f"Player count must be between 2 and 10, got {len(player_ids)}"
        raise ValueError(msg)

    randomizer = rng or random.Random()
    working_deck = deck or Deck.standard()
    working_deck.shuffle(randomizer)

    cards_per_hand, _ = deal_config(len(player_ids))
    players = [
        PlayerState(id=player_id, hand=working_deck.draw(cards_per_hand))
        for player_id in player_ids
    ]
    rows = seed_rows(working_deck)

    return GameState(
        phase=GamePhase.SUBMIT,
        round_number=1,
        rows=rows,
        players=players,
        deck=working_deck,
    )


def finalize_if_complete(state: GameState) -> GameState:
    """Transition to FINISHED when all hands are empty and compute winners."""
    if any(player.hand for player in state.players):
        return state

    bones_totals = {player.id: player.bones_total for player in state.players}
    return replace(
        state,
        phase=GamePhase.FINISHED,
        winner_ids=winner_ids(bones_totals),
    )
