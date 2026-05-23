# GraphQL Schema

## Implementation status

**M3 — complete.** Full schema in `backend/app/graphql/` — queries, mutations, subscriptions, public/private view builders. OpenAPI contract: `backend/openapi.yaml`.

**Delivered in M3:**

- `last_resolution` populated via `apply_game_state` during turn resolve
- `SubscriberRegistry` → `gameRoomUpdated` / `myGameViewUpdated`
- WS disconnect → `schedule_disconnect` on subscription teardown; `reconnect` on subscribe
- `InfrastructureError.code` → `GameErrorCode` in mutation payloads; HTTP 401 for auth failures

## Design Principles

1. **Separate public and private views** — Never expose `GameRoom` with optional hidden fields; use distinct types.
2. **Subscription-first live play** — Clients subscribe to room updates; queries bootstrap initial state only.
3. **Explicit mutation errors** — Return union or payload with `errors: [GameError!]!` and stable error codes.
4. **No pre-resolve leaks** — Other players' `submitCard` choices must not appear in any field until `RESOLVE` completes.

## Scalar & Enums

```graphql
scalar DateTime

enum GamePhase {
  LOBBY
  DEAL
  SUBMIT
  RESOLVE
  SCORE
  FINISHED
}

enum GameErrorCode {
  UNAUTHENTICATED
  ROOM_NOT_FOUND
  ROOM_FULL
  GAME_ALREADY_STARTED
  NOT_HOST
  INVALID_PHASE
  CARD_NOT_IN_HAND
  ALREADY_SUBMITTED
  PLAYER_NOT_IN_ROOM
  SESSION_EXPIRED
}
```

## Core Types

### Public (all subscribers see identical payload)

```graphql
type Card {
  id: ID!
  value: Int!
  bones: Int!
}

type Row {
  index: Int!          # 0–3
  cards: [Card!]!      # Ascending, max 5 before sixth triggers collection
}

type PlayerPublic {
  id: ID!
  displayName: String!
  bonesTotal: Int!
  cardsInHand: Int!    # Count only — not values
  hasSubmitted: Boolean!
  isConnected: Boolean!
  isHost: Boolean!
}

type GameRoomPublic {
  id: ID!
  code: String!        # 6-char join code
  phase: GamePhase!
  roundNumber: Int!
  rows: [Row!]!
  players: [PlayerPublic!]!
  submissionProgress: SubmissionProgress!
  winnerIds: [ID!]     # Non-null when phase == FINISHED
  updatedAt: DateTime!
}

type SubmissionProgress {
  submitted: Int!
  required: Int!
}
```

### Private (scoped to authenticated guest / connection)

```graphql
type PlayerPrivateView {
  room: GameRoomPublic!
  myPlayerId: ID!
  myHand: [Card!]!
  mySubmittedCard: Card    # Null until submitted this round; visible only to self pre-resolve
  lastResolvedPlays: [ResolvedPlay!]!  # Populated after each RESOLVE
}

type ResolvedPlay {
  playerId: ID!
  card: Card!
  rowIndex: Int
  bonesTaken: Int!       # Bones collected this play, 0 if none
}
```

## Queries

```graphql
type Query {
  """Bootstrap guest session if missing; returns token + guestId."""
  ensureGuestSession: GuestSession!

  """Fetch room by join code (public view only). Requires auth."""
  roomByCode(code: String!): GameRoomPublic

  """Full private view for current guest in a room."""
  myGameView(roomId: ID!): PlayerPrivateView

  """Health check for Docker / portfolio demo."""
  health: String!
}
```

## Mutations

```graphql
type Mutation {
  createRoom(displayName: String!, maxPlayers: Int = 10): MutationResult!
  joinRoom(code: String!, displayName: String!): MutationResult!
  leaveRoom(roomId: ID!): MutationResult!
  startGame(roomId: ID!): MutationResult!      # Host only, LOBBY only
  submitCard(roomId: ID!, cardId: ID!): MutationResult!
  updateDisplayName(displayName: String!): MutationResult!
}

type MutationResult {
  success: Boolean!
  errors: [GameError!]!
  view: PlayerPrivateView   # Convenience: return refreshed private view on success
}

type GameError {
  code: GameErrorCode!
  message: String!
}
```

### Mutation Semantics

| Mutation | Preconditions | Side effects |
|---|---|---|
| `createRoom` | Authenticated guest | New Redis room, creator = host |
| `joinRoom` | LOBBY, not full | Add seat, broadcast public state |
| `leaveRoom` | In room | Remove seat or mark disconnected mid-game |
| `startGame` | Host, LOBBY, ≥2 players | Deal, seed rows, → SUBMIT |
| `submitCard` | SUBMIT, card in hand | Lock submission; maybe trigger resolve |

## Subscriptions

```graphql
type Subscription {
  """
  Public room updates — same payload for all listeners.
  Use for board, rows, player statuses, phase changes.
  """
  gameRoomUpdated(roomId: ID!): GameRoomPublic!

  """
  Private view for the authenticated guest only.
  Includes hand, submitted card, and resolved play details.
  Prefer this as the primary driver for the play screen.
  """
  myGameViewUpdated(roomId: ID!): PlayerPrivateView!
}
```

### Subscription Authorization

- WebSocket connection must carry `Authorization: Bearer <guestToken>`
- Resolver validates token → `guestId` → must be seated in `roomId` (or allow spectator mode post-MVP)
- `myGameViewUpdated` **must** filter hands and submissions per connection — never broadcast a shared private payload

## Visibility Implementation (Backend)

```python
# Pseudocode — resolver layer
def build_private_view(room_state, guest_id: str) -> PlayerPrivateView:
    public = sanitize_public(room_state)
    seat = room_state.seat_for(guest_id)
    return PlayerPrivateView(
        room=public,
        my_player_id=seat.player_id,
        my_hand=seat.hand,  # NEVER include in GameRoomPublic
        my_submitted_card=seat.submission if room_state.phase == SUBMIT else None,
        last_resolved_plays=room_state.last_resolution,
    )
```

## DataLoaders

| Loader | Batch key | Use case |
|---|---|---|
| `PlayerProfileLoader` | `guest_id` | Match history display names |
| `MatchSummaryLoader` | `match_id` | Post-game stats page (post-MVP) |

Avoid loaders for live Redis room state — single `HGETALL` or JSON blob per room is sufficient.

## Example Operations (Client)

### Subscription (primary)

```graphql
subscription MyGameView($roomId: ID!) {
  myGameViewUpdated(roomId: $roomId) {
    myPlayerId
    myHand { id value bones }
    mySubmittedCard { id value }
    room {
      phase
      roundNumber
      rows { index cards { id value bones } }
      players { id displayName bonesTotal hasSubmitted isConnected }
      submissionProgress { submitted required }
    }
  }
}
```

### Submit card

```graphql
mutation SubmitCard($roomId: ID!, $cardId: ID!) {
  submitCard(roomId: $roomId, cardId: $cardId) {
    success
    errors { code message }
    view { myHand { id value } mySubmittedCard { id } }
  }
}
```

## Error Handling Convention

- HTTP 401 for unauthenticated GraphQL requests (missing/invalid token)
- Mutation `success: false` with typed `GameErrorCode` for business rule violations
- Never use exceptions for expected game rule failures (card not in hand, wrong phase)

## Post-MVP Extensions (Document Only)

```graphql
# type MatchHistory { ... }
# query myMatchHistory(limit: Int): [MatchSummary!]!
```

## Cross-References

- Redis state shape: [state-management.md](./state-management.md)
- Guest token on WebSocket: [auth.md](./auth.md)
- Vue URQL usage: [frontend-patterns.md](./frontend-patterns.md)
