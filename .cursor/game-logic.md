# Game Logic

## Game Summary

**6 nimmt!** (*Take 6*) is a trick-avoidance card game. Players simultaneously play numbered cards onto four ascending rows. Playing the sixth card in a row (or being forced to take a row) collects **bones** (penalty points). **Lowest total bones wins.**

## Card Deck

- **104 cards**, numbered **1–104**
- Each card has a **bone count** (penalty value):

| Condition | Bones |
|---|---|
| Card 55 | 7 |
| Multiples of 11 (except 55) | 5 |
| Multiples of 10 | 3 |
| Multiples of 5 (not already above) | 2 |
| All others | 1 |

Implement as a pure function:

```python
def bones(value: int) -> int: ...
```

## Player Count & Deal

| Players | Cards per hand | Rounds | Cards used from deck |
|---|---|---|---|
| 2 | 10 | 10 | 100 |
| 3 | 9 | 9 | 81 |
| 4 | 8 | 8 | 64 |
| 5 | 7 | 7 | 70 |
| 6 | 6 | 6 | 84 |
| 7 | 5 | 5 | 70 |
| 8 | 4 | 4 | 64 |
| 9 | 3 | 3 | 54 |
| 10 | 2 | 2 | 40 |

- Room supports **2–10 players** (configurable max in lobby)
- Deck shuffled once at game start
- Each row starts with **one card** (four open cards total) before round 1

## Row Placement Rules

Four rows, each maintains **ascending order**. On each round:

1. All players **simultaneously** choose one card from their hand
2. When all submissions received, reveal and **sort submitted cards ascending**
3. For each card in sorted order, apply placement:

### Rule A — Normal placement

Place the card on the row whose **last card** is the **greatest value still less than** the played card (i.e., closest lower tail).

### Rule B — Row full (6th card)

If the chosen row already has **5 cards**, the player **takes** those 5 cards (adds bones to their score pile), and the played card **becomes the sole card** in that row.

### Rule C — Card too low

If the played card is **lower than all four row tail cards**, the player **chooses which row to take** (all cards in that row go to their bone pile), and their played card **starts that row**.

> **v1 simplification:** For automated online play, if Rule C applies, **auto-select the row with the fewest bones** (tie-break: lowest tail value). Document this in UI copy. Future: optional timed UI for row choice.

## Scoring

- Collected cards accumulate **bones** (sum of each card's bone count)
- During the game, expose each player's **running bones total**
- After the final round, **lowest bones total wins** (ties: shared victory)

## Game Phases (FSM)

```python
class GamePhase(str, Enum):
    LOBBY = "LOBBY"           # Waiting for players, host can start
    DEAL = "DEAL"             # Transient: shuffle, deal, seed rows
    SUBMIT = "SUBMIT"         # Players pick cards concurrently
    RESOLVE = "RESOLVE"       # Transient: run placement algorithm
    SCORE = "SCORE"           # Transient: update totals, check end
    FINISHED = "FINISHED"     # Game over, show results
```

- `DEAL`, `RESOLVE`, `SCORE` exist in the domain enum for clarity and future animation hooks
- **As implemented (M2):** `start_game()` jumps LOBBY → SUBMIT atomically; `resolve_turn()` uses transient `RESOLVE` internally then returns to `SUBMIT` or `FINISHED`. Clients will not observe `DEAL`/`SCORE` until M3/M4 expose phase transitions for UI overlays
- Public phases to expose via GraphQL (M3): `LOBBY`, `SUBMIT`, `FINISHED` (+ optional `DEAL`/`RESOLVE`/`SCORE` for animations in M4)

## Simultaneous Submission Barrier

```
SUBMIT phase:
  - Each player may submit exactly one cardId per round
  - Submission stored server-side; invisible to other players
  - Local player sees own submission as "locked" (optional: show selected card face-up to self only)

When |submissions| == |active_players|:
  - Transition to RESOLVE
  - Run resolve_turn(submissions, rows, hands)
  - Clear submissions
  - If all hands empty → FINISHED else → SUBMIT (next round)
```

### Active players

- **Domain:** `PlayerState.is_active` — included in submission barrier via `active_player_ids`
- **Infrastructure:** `PlayerInRoom.is_connected` — UI presence flag; `reconnect()` / `mark_disconnected()` (disconnect grace M3)
- **As implemented (M2):** adapter maps all seated players to `is_active=True`; submit barrier waits for **all seated players** (not filtered by `is_connected`). Disconnected players who haven't submitted are auto-played on the 30s submit timeout
- **Left lobby:** player removed in LOBBY; mid-game leave sets `is_connected=false` but keeps seat

## Domain Module Structure

**Status:** M1 complete — implemented and covered by `backend/tests/test_domain.py`.

```
backend/app/domain/
  cards.py        # bones, Card, Deck
  rows.py         # Row, placement helpers
  game.py         # GameState, phase transitions
  resolve.py      # resolve_turn — core algorithm
  scoring.py      # bones totals, winner
```

All functions accept and return **immutable or copy-on-write** dataclasses / Pydantic models — no side effects.

## `resolve_turn` Algorithm (Pseudocode)

```python
def resolve_turn(state: GameState, submissions: dict[PlayerId, CardId]) -> GameState:
    ordered = sorted(submissions.items(), key=lambda x: card_value(x[1]))
    new_state = state.copy()

    for player_id, card_id in ordered:
        card = new_state.remove_from_hand(player_id, card_id)
        row_idx = find_best_row(new_state.rows, card.value)

        if row_idx is None:
            # Rule C — auto pick row (v1)
            row_idx = pick_least_bones_row(new_state.rows)
            new_state.collect_row(player_id, row_idx)
            new_state.rows[row_idx] = Row(cards=[card])
        elif len(new_state.rows[row_idx].cards) == 5:
            # Rule B
            new_state.collect_row(player_id, row_idx, exclude_new=False)
            new_state.rows[row_idx] = Row(cards=[card])
        else:
            # Rule A
            new_state.rows[row_idx].cards.append(card)

    new_state.round_number += 1
    return new_state
```

Complexity per round: **O(p log p + p)** where p = player count (≤ 10) — negligible.

## Edge Cases

| Scenario | Behavior |
|---|---|
| Player joins mid-game | **Rejected** — only join in LOBBY |
| Player disconnects in LOBBY | Remove seat after TTL or on explicit leave |
| Player disconnects in SUBMIT (no submission) | After **30s** timeout: auto-play **lowest card** in hand |
| Player disconnects in SUBMIT (submitted) | Submission locked; counts toward barrier |
| Host leaves in LOBBY | Transfer host to earliest joiner or disband room |
| Invalid card submitted | Mutation error; no state change |
| Duplicate submission | Idempotent reject or replace (pick one: **reject second**) |
| Reconnect | Same `guestId` reclaims seat if token valid and seat reserved |

## Information Visibility Matrix

| Data | Owner | Others | Spectators |
|---|---|---|---|
| Own hand | ✅ | ❌ | ❌ |
| Own submission (pre-resolve) | ✅ (optional face-up) | ❌ | ❌ |
| Others' submission count | ✅ ("3/4 submitted") | ✅ | ✅ |
| Others' chosen card (pre-resolve) | ❌ | ❌ | ❌ |
| All played cards (post-resolve) | ✅ | ✅ | ✅ |
| Row state | ✅ | ✅ | ✅ |
| Bones totals | ✅ | ✅ | ✅ |

## Testing Requirements

Unit tests (no I/O) must cover:

- `bones` for all rule branches
- Normal placement across four rows
- Rule B (sixth card triggers collection)
- Rule C (auto row pick — verify tie-break)
- Full 2-player mini-game (2 rounds, 2 cards each)
- Submission barrier does not resolve until complete

## Cross-References

- API exposure rules: [graphql-schema.md](./graphql-schema.md)
- Redis representation: [state-management.md](./state-management.md)
- Phase pub/sub: [architecture-overview.md](./architecture-overview.md)
