from __future__ import annotations

from dataclasses import dataclass, replace

from app.domain.cards import Card
from app.domain.game import GamePhase, GameState, PlayerId, finalize_if_complete
from app.domain.rows import Row, find_best_row, pick_least_bones_row


@dataclass(frozen=True)
class ResolvedPlay:
    """Per-card placement trace produced by resolve_turn."""

    player_id: PlayerId
    card: Card
    row_index: int
    collected_row: bool
    bones_taken: int


def all_submissions_received(
    state: GameState,
    submissions: dict[PlayerId, str],
) -> bool:
    """Return True when every active player has submitted a card id."""
    active_ids = set(state.active_player_ids)
    return active_ids == set(submissions.keys())


def resolve_turn(state: GameState, submissions: dict[PlayerId, str]) -> GameState:
    """Apply placement rules for one round. Caller must ensure barrier is complete."""
    if not all_submissions_received(state, submissions):
        msg = "Cannot resolve turn until all active players have submitted"
        raise ValueError(msg)

    if state.phase not in {GamePhase.SUBMIT, GamePhase.RESOLVE}:
        msg = f"Cannot resolve turn during phase {state.phase.value}"
        raise ValueError(msg)

    new_state = state.copy()
    new_state.phase = GamePhase.RESOLVE
    trace: list[ResolvedPlay] = []

    ordered = sorted(
        submissions.items(),
        key=lambda item: new_state.hand_card_value(item[0], item[1]),
    )

    for player_id, card_id in ordered:
        card = new_state.remove_from_hand(player_id, card_id)
        row_idx = find_best_row(new_state.rows, card.value)
        bones_before = new_state.player_by_id(player_id).bones_total
        collected_row = False

        if row_idx is None:
            row_idx = pick_least_bones_row(new_state.rows)
            new_state.collect_row(player_id, row_idx)
            new_state.rows[row_idx] = Row(cards=[card])
            collected_row = True
        elif len(new_state.rows[row_idx].cards) == 5:
            new_state.collect_row(player_id, row_idx)
            new_state.rows[row_idx] = Row(cards=[card])
            collected_row = True
        else:
            new_state.rows[row_idx].cards.append(card)

        bones_after = new_state.player_by_id(player_id).bones_total
        trace.append(
            ResolvedPlay(
                player_id=player_id,
                card=card,
                row_index=row_idx,
                collected_row=collected_row,
                bones_taken=bones_after - bones_before,
            )
        )

    new_state.round_number += 1
    new_state.last_resolution = trace
    new_state = finalize_if_complete(new_state)
    if new_state.phase != GamePhase.FINISHED:
        new_state = replace(new_state, phase=GamePhase.SUBMIT)
    return new_state
