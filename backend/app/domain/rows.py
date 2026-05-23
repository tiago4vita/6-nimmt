from __future__ import annotations

from dataclasses import dataclass, field

from app.domain.cards import Card, bones


@dataclass
class Row:
    cards: list[Card] = field(default_factory=list)

    @property
    def tail(self) -> int | None:
        if not self.cards:
            return None
        return self.cards[-1].value


def row_bones(row: Row) -> int:
    return sum(bones(card.value) for card in row.cards)


def find_best_row(rows: list[Row], card_value: int) -> int | None:
    """Rule A: row whose tail is the greatest value still less than card_value."""
    best_idx: int | None = None
    best_tail = -1

    for idx, row in enumerate(rows):
        tail = row.tail
        if tail is None:
            continue
        if tail < card_value and tail > best_tail:
            best_tail = tail
            best_idx = idx

    return best_idx


def pick_least_bones_row(rows: list[Row]) -> int:
    """Rule C v1: auto-pick row with fewest bones; tie-break lowest tail."""
    best_idx = 0
    best_bones = row_bones(rows[0])
    best_tail = rows[0].tail or 0

    for idx in range(1, len(rows)):
        row_bones_total = row_bones(rows[idx])
        tail = rows[idx].tail or 0
        if row_bones_total < best_bones or (row_bones_total == best_bones and tail < best_tail):
            best_bones = row_bones_total
            best_tail = tail
            best_idx = idx

    return best_idx
