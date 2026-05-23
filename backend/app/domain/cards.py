from __future__ import annotations

import random
from dataclasses import dataclass, field


def bones(value: int) -> int:
    """Return the bone count (penalty value) for a card value (1–104)."""
    if value == 55:
        return 7
    if value % 11 == 0:
        return 5
    if value % 10 == 0:
        return 3
    if value % 5 == 0:
        return 2
    return 1


@dataclass(frozen=True)
class Card:
    id: str
    value: int

    @property
    def bones(self) -> int:
        return bones(self.value)


def make_card(value: int) -> Card:
    return Card(id=f"c{value}", value=value)


@dataclass
class Deck:
    cards: list[Card] = field(default_factory=list)

    @classmethod
    def standard(cls) -> Deck:
        return cls(cards=[make_card(value) for value in range(1, 105)])

    def shuffle(self, rng: random.Random | None = None) -> None:
        randomizer = rng or random.Random()
        randomizer.shuffle(self.cards)

    def draw(self, count: int = 1) -> list[Card]:
        if count > len(self.cards):
            msg = f"Cannot draw {count} cards from deck with {len(self.cards)} remaining"
            raise ValueError(msg)
        drawn = self.cards[:count]
        self.cards = self.cards[count:]
        return drawn
