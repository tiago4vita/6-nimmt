# Authentication — Anonymous Guest Sessions

## Implementation status (M2)

| Component | Status | Location |
|---|---|---|
| Session mint/validate/touch | ✅ Implemented | `backend/app/infrastructure/sessions.py` |
| Bearer + `X-Guest-Id` extraction | ✅ Implemented | `backend/app/infrastructure/auth.py` |
| `get_current_guest()` | ✅ Implemented | Not wired to GraphQL context yet (M3) |
| GraphQL `ensureGuestSession` | ⬜ M3 | Client cannot mint sessions today |
| Frontend session bootstrap | ⬜ M4 | `guest-session.ts` reads localStorage only |

**Token model:** Option A (UUID + opaque bearer + SHA-256 hash in Redis). `SESSION_SECRET` in config is **unused** — reserved for optional JWT (Option B) later.

## v1 Scope

- **No** user accounts, passwords, OAuth, or email
- Each browser gets a **guest identity** (`guestId`) and **session token** (`sessionToken`)
- Tokens authorize GraphQL HTTP and WebSocket connections
- Display name is cosmetic and set per room join

## Session Lifecycle

```mermaid
sequenceDiagram
    participant C as Client
    participant Q as Query ensureGuestSession
    participant R as Redis

    C->>Q: First visit (no token)
    Q->>R: SET guest:session:{guestId}
    Q->>C: { guestId, sessionToken, expiresAt }
    C->>C: localStorage.setItem

    Note over C,R: Subsequent requests include Authorization header

    C->>Q: Request with Bearer token
    Q->>R: GET guest:session:{guestId}
    Q->>Q: Validate token hash + expiry
```

## Issued Credentials

```graphql
type GuestSession {
  guestId: ID!
  sessionToken: String!   # Opaque bearer token — only returned once per creation/refresh
  expiresAt: DateTime!
}
```

### Storage

| Location | Key | Value |
|---|---|---|
| Browser `localStorage` | `6nimmt_guest` | JSON `{ guestId, sessionToken, expiresAt }` |
| Redis | `guest:session:{guestId}` | See below |

### Redis session document

```json
{
  "guestId": "uuid",
  "tokenHash": "sha256(...)",
  "createdAt": "ISO8601",
  "expiresAt": "ISO8601",
  "lastSeenAt": "ISO8601",
  "displayName": "optional default"
}
```

**Never store raw tokens in Redis** — store `SHA-256(sessionToken)` only.

## Client Transport

### HTTP (queries & mutations)

```
Authorization: Bearer <sessionToken>
X-Guest-Id: <guestId>          # Optional redundancy for debugging; token is authoritative
```

### WebSocket (subscriptions)

Use `graphql-ws` `connectionParams`:

```typescript
connectionParams: () => ({
  authorization: `Bearer ${session.sessionToken}`,
})
```

Backend reads the same validation path as HTTP middleware.

## Backend Validation Middleware

**Implemented** in `backend/app/infrastructure/auth.py`:

```python
async def get_current_guest(headers, *, client=None) -> GuestContext:
    token = extract_bearer(headers)
    guest_id = extract_guest_id(headers)
    if not token or not guest_id:
        raise UnauthenticatedError("Missing bearer token or X-Guest-Id header")

    session = await sessions.validate_token(guest_id, token, client=client)
    await sessions.touch_session(guest_id, client=client)
    return GuestContext(guest_id=session.guest_id, display_name=session.display_name)
```

**M3:** Wire via Strawberry `get_context` on HTTP and WebSocket. Fail closed: missing/invalid → GraphQL error extension `UNAUTHENTICATED`.

## Token Format Options

**Recommended (portfolio-simple):**

- `guestId` = UUID v4
- `sessionToken` = `secrets.token_urlsafe(32)`
- Lookup: client sends token; server scans guestId from parallel header **or** embed guestId in signed JWT

**Option A — UUID + opaque token (chosen):**

- Client stores both; sends `Authorization: Bearer {token}` and `X-Guest-Id: {guestId}`
- Server loads `guest:session:{guestId}`, verifies hash

**Option B — Single JWT:**

- Payload: `{ sub: guestId, exp }`, signed with server secret
- Simpler headers but adds PyJWT dependency

Stick with **Option A** for clarity in a portfolio write-up.

## Display Names

- Set via `joinRoom(displayName)` or `createRoom(displayName)`
- Max length: **32** characters
- Allowed: alphanumeric, spaces, hyphen, underscore
- Strip leading/trailing whitespace; reject empty
- No uniqueness enforced (multiple "Guest" allowed)

## Authorization Rules

| Action | Requirement |
|---|---|
| `createRoom` | Valid guest session |
| `joinRoom` | Valid guest session |
| `startGame` | Seated player + `isHost` |
| `submitCard` | Seated player + correct phase |
| `myGameView` | Seated in room |
| `myGameViewUpdated` | Seated in room; filter private fields |

Guests **not** in a room may still call `ensureGuestSession` and `roomByCode` (public lobby peek — optional restrict to seated only post-MVP).

## Reconnect & Identity Recovery

**Infrastructure (M2):** `game.reconnect()` matches `guestId` to seat and sets `isConnected = true`; cancels pending disconnect timer.

**Not wired yet (M3):** WebSocket connect/disconnect must call `reconnect` / `schedule_disconnect`. Until then, clients cannot trigger reconnect through the API.

Target client flow:

1. Client loads `localStorage` session
2. If expired → call `ensureGuestSession` (creates **new** guest — old seat lost unless post-MVP seat recovery)
3. If valid → reconnect WebSocket, call `myGameView(roomId)`
4. Server matches `guestId` to seat in Redis room → `reconnect()` marks `isConnected = true`

**Portfolio limitation:** Clearing localStorage mid-game creates a new guest — acceptable for v1; document in UI.

## Session Expiry

- Default TTL: **7 days** sliding window
- Refresh `lastSeenAt` on each authenticated request
- `ensureGuestSession`: if valid session exists, return same credentials; if expired, mint new guest

## Security Notes ( proportionate for local portfolio )

| Topic | Approach |
|---|---|
| HTTPS | Not required locally; use `http://localhost` |
| CSRF | Bearer token in header — not cookie — CSRF N/A |
| Token theft | Out of scope locally; don't log tokens |
| Rate limiting | Optional FastAPI middleware post-MVP |
| Room codes | 6 chars, uppercase alphanumeric, ~2B combinations — sufficient |

## Cross-References

- GraphQL auth errors: [graphql-schema.md](./graphql-schema.md)
- Client storage: [frontend-patterns.md](./frontend-patterns.md)
- Redis keys: [state-management.md](./state-management.md)
