# Sound Design — BARE BONES

Branch: `frontend/new-visuals` (or current feature branch)  
**Read first:** [frontend-design.md](./frontend-design.md), [frontend-patterns.md](./frontend-patterns.md).

Single source of truth for **SFX architecture**, event catalog, asset layout, and implementation order.

---

## Goals

1. **Dry, woody clicks** for primary UI actions (buttons, confirm bars).
2. **Short card whoops** on select and submit — tactile, not cartoonish.
3. **Generic win / lose stings** when the results overlay appears (stock-style, neutral).
4. **Muted by default** — respect existing `nimmt:sfxEnabled` (`false`); no autoplay surprises.
5. **Clean code** — typed events, one engine, triggers at domain boundaries (composables/views), never inside Three.js meshes.

**Out of scope (this pass):** background music, voice, per-bone-tier sounds, opponent-specific SFX, haptics.

---

## Aesthetic direction

| Category | Feel | Duration | Notes |
|---|---|---|---|
| `ui.click` | Dry wood tap / block knock | 50–150 ms | Slight variation across 2–3 samples |
| `card.select` | Soft whoosh / air swipe | ~150–250 ms | Lighter than submit |
| `card.submit` | Fuller whoop / whoosh | ~200–400 ms | Plays on confirm + hand→staging flight start |
| `game.win` | Generic success sting | ~400–800 ms | Neutral stock SFX; not celebratory fanfare |
| `game.lose` | Generic fail / down sting | ~400–800 ms | Short, not punishing |

Normalize all assets; keep files **&lt; 30 KB** each (MP3 or OGG).

---

## Architecture (recommended)

**Web Audio API + typed catalog + singleton engine + `useSfx()` composable.**  
No new npm dependencies — the roadmap already targets Web Audio; overlap during resolve is easier to manage than raw `<audio>` tags.

```
frontend/public/sfx/
  ui/
    click-wood-1.mp3
    click-wood-2.mp3
  card/
    whoosh-soft.mp3
    whoosh.mp3
  game/
    win.mp3
    lose.mp3

frontend/src/lib/sfx/
  types.ts        # SfxEvent union
  catalog.ts      # event → { srcs[], volume, category } — no Vue imports
  engine.ts       # preload, play, unlock AudioContext (singleton)

frontend/src/composables/
  useSfx.ts       # reads nimmt:sfxEnabled; exposes play(), unlock()
```

### Layer responsibilities

| Layer | Responsibility |
|---|---|
| `types.ts` | `SfxEvent` union — the only names callers may use |
| `catalog.ts` | File paths, per-event volume, optional random pool |
| `engine.ts` | Decode buffers, mix categories, no-op when disabled, `unlock()` for browser policy |
| `useSfx.ts` | Bridge Vue reactivity (`useLocalStorage`) to engine |
| Views / composables | Call `play('ui.click')` at **domain moments** — not inside every template |

### Why not scatter `<audio>` or import sounds in components?

- **Typed events** prevent `/sfx/foo.mp3` strings in Vue files.
- **One mute switch** — engine checks preference once.
- **Three.js stays silent** — `CardMesh` / motion queue never import audio.
- **Testable** — mock `useSfx()` in composable tests.

### Button click strategy

Use **explicit `play('ui.click')` at the start of action handlers** (not a global document listener):

- Clear and grep-friendly.
- Avoids accidental sounds on disabled buttons or dev toggles.
- Matches existing handler-centric patterns (`createRoom`, `handleConfirm`, etc.).

Optional: also play on `CardConfirmBar` confirm/cancel and `ResultsOverlay` rematch/leave.

---

## Event catalog (locked)

```typescript
export type SfxEvent =
  | 'ui.click'
  | 'card.select'
  | 'card.submit'
  | 'game.win'
  | 'game.lose'
```

| Event | When | Volume (starting point) | Assets |
|---|---|---|---|
| `ui.click` | Primary/secondary `.btn` actions, confirm/cancel bars, copy actions | `0.35` | `ui/click-wood-*.mp3` (random) |
| `card.select` | Hand card selected (`selectCard`) | `0.45` | `card/whoosh-soft.mp3` |
| `card.submit` | Confirm play succeeds; start of hand→staging flight | `0.55` | `card/whoosh.mp3` |
| `game.win` | Results overlay shown; local player in `winnerIds` | `0.60` | `game/win.mp3` |
| `game.lose` | Results overlay shown; local player not in `winnerIds` | `0.60` | `game/lose.mp3` |

**Win/lose tie rule:** If `winnerIds` includes `myPlayerId`, play `game.win` (including shared victory). Otherwise `game.lose`.

Do **not** add ad-hoc event names in components — extend `types.ts` + `catalog.ts` first.

---

## Trigger map

| Event | File | Hook |
|---|---|---|
| `ui.click` | `HomeView.vue` | Start of `createRoom`, `joinRoom` |
| `ui.click` | `LobbyView.vue` | `saveDisplayName`, `handleStartGame`, leave confirm primary |
| `ui.click` | `CardConfirmBar.vue` | Confirm + cancel emits (or parent handlers) |
| `ui.click` | `ResultsOverlay.vue` | Rematch + exit handlers (via parent or local) |
| `ui.click` | `CopyRoomActions.vue` | Copy code / link |
| `card.select` | `useCardSelection.ts` | End of `selectCard` (after lock check passes) |
| `card.submit` | `GameView.vue` | `handleConfirm` — after lock check, before/with `beginYourFlight` |
| `game.win` / `game.lose` | `GameView.vue` | When `showResults` becomes `true` (or `scheduleResultsOverlay` callback) — derive from `room.winnerIds` + `myPlayerId` |
| `unlock()` | `SfxToggle.vue` | When enabling SFX; optional soft `ui.click` feedback |

**Do not trigger:**

- Inside `CardMesh.vue`, `useCardMotionQueue.ts`, or `useGameMotion.ts` (visual layer only).
- On subscription reconnect, toasts, or phase shimmer overlays.
- On bone pop (`onBonePop`) — visual-only unless catalog is extended later.

---

## User preference & browser policy

| Key | Storage | Default |
|---|---|---|
| `nimmt:sfxEnabled` | `localStorage` via `@vueuse/core` | `false` |

**Rules:**

1. Engine **no-ops** when preference is `false`.
2. Call `unlock()` on first user gesture that enables SFX (toggle on, or first `play` after enable).
3. Resume suspended `AudioContext` after tab backgrounding (listen `visibilitychange` optional).
4. **Optional a11y:** if `prefers-reduced-motion: reduce`, skip non-essential SFX (`card.select` only); still allow explicit toggle — document in code comment.

Existing UI: `SfxToggle.vue` in `AppShell` header — wire toggle to `unlock()`, do not change key name.

---

## Asset sourcing

Placeholder filenames are fine for implementation; replace with final royalty-free samples before demo:

| Slot | Search terms |
|---|---|
| Woody click | “wood block click”, “dry wood tap UI” |
| Card whoosh | “soft whoosh UI”, “card swipe air” |
| Win / lose | “game success sting short”, “game fail short neutral” |

Commit MP3/OGG under `frontend/public/sfx/`. If assets are missing during dev, engine should fail silently (no console spam in production).

---

## Implementation phases

### Phase 1 — Engine foundation

| Task | Files |
|---|---|
| `types.ts`, `catalog.ts`, `engine.ts` | `frontend/src/lib/sfx/*` |
| `useSfx()` composable | `frontend/src/composables/useSfx.ts` |
| Placeholder or real assets | `frontend/public/sfx/**` |

**Acceptance:** With SFX enabled, `play('ui.click')` from dev console or test button audibly works after unlock.

### Phase 2 — Toggle & preference

| Task | Files |
|---|---|
| Wire `SfxToggle` → `unlock()` on enable | `SfxToggle.vue` |
| Share single `useLocalStorage` key | `useSfx.ts` + `SfxToggle.vue` (avoid duplicate refs) |

**Acceptance:** Toggle on → next click plays; toggle off → immediate silence.

### Phase 3 — UI clicks

| Task | Files |
|---|---|
| Woody click on home/lobby/results primary actions | `HomeView.vue`, `LobbyView.vue`, `ResultsOverlay.vue`, `CardConfirmBar.vue`, `CopyRoomActions.vue` |

**Acceptance:** Create/join/start/rematch/confirm all click with variation when enabled.

### Phase 4 — Card sounds

| Task | Files |
|---|---|
| Select whoosh | `useCardSelection.ts` |
| Submit whoop | `GameView.vue` `handleConfirm` |

**Acceptance:** Select card → soft whoosh; confirm → stronger whoop; keyboard `1`–`N` + Enter path also covered.

### Phase 5 — End game

| Task | Files |
|---|---|
| Win/lose on results reveal | `GameView.vue` (mirror logic if `ResultsView.vue` deep-links) |

**Acceptance:** FINISHED → overlay delay → correct sting for winner/loser; no double-fire on rematch.

### Phase 6 — QA & docs

| Task | Files |
|---|---|
| `npm run build` | — |
| Manual: muted default, toggle, two-browser finish | — |
| Mark roadmap M6.16 complete | `.cursor/roadmap.md` |

---

## Verification checklist

- [x] Default load: no sound until user enables SFX
- [x] `SfxToggle` persists across refresh
- [x] Enabling SFX + first action unlocks audio (no NotAllowedError)
- [x] Woody clicks on create/join/start/confirm/rematch
- [x] Card select + submit whoops work via mouse and keyboard
- [x] Win sting when `myPlayerId ∈ winnerIds`; lose otherwise
- [x] SFX off → zero network fetch for buffers (or cached but silent)
- [x] No imports from `lib/sfx` inside `components/game/scene/*`
- [x] `npm run build` passes

---

## Agent handoff

Copy the prompt from [roadmap.md](./roadmap.md#agent-prompt--sound-design-m616) or the **Detailed agent prompt** section below when starting implementation.

### Detailed agent prompt

```
You are implementing BARE BONES sound effects (M6.16) on the current frontend branch.

READ FIRST (mandatory):
- .cursor/sfx-design.md
- .cursor/frontend-patterns.md
- .cursor/frontend-design.md

SOUND RULES (locked):
- ui.click — dry woody button tap (2+ random variants), volume ~0.35
- card.select — soft whoosh on hand selection, volume ~0.45
- card.submit — fuller whoop on confirm play / flight start, volume ~0.55
- game.win / game.lose — generic stock stings when results overlay appears, volume ~0.60
- Default OFF — localStorage key nimmt:sfxEnabled (already used by SfxToggle), default false
- Win if myPlayerId is in room.winnerIds; else lose (ties where you win → win sting)

ARCHITECTURE (mandatory):
- frontend/src/lib/sfx/types.ts — SfxEvent union
- frontend/src/lib/sfx/catalog.ts — paths + volumes; NO Vue imports
- frontend/src/lib/sfx/engine.ts — Web Audio singleton: preload, play, unlock, silent no-op when disabled
- frontend/src/composables/useSfx.ts — useLocalStorage + play() + unlock()
- Assets in frontend/public/sfx/ (ui/, card/, game/)
- NO new npm packages (no howler)
- NEVER import sfx from Three.js scene code (CardMesh, useGameMotion, useCardMotionQueue)

TRIGGER POINTS:
- ui.click — explicit at start of action handlers: HomeView createRoom/joinRoom, LobbyView saveDisplayName/handleStartGame, CardConfirmBar, ResultsOverlay rematch/exit, CopyRoomActions
- card.select — useCardSelection.selectCard (after lock check)
- card.submit — GameView handleConfirm (with beginYourFlight)
- game.win | game.lose — when showResults becomes true (GameView); check winnerIds vs myPlayerId
- unlock() — SfxToggle when enabling SFX

CONSTRAINTS:
- Do NOT change game logic, GraphQL, motion queue semantics, or visual identity tokens
- Do NOT add sounds to bone pop, resolve toasts, or reconnect banner
- Engine fails silently if asset missing
- Preserve accessibility: SfxToggle aria labels unchanged
- Match conventions: script setup, @/ aliases, minimal scope

IMPLEMENTATION ORDER:
1. lib/sfx (types, catalog, engine)
2. useSfx composable
3. SfxToggle unlock wiring
4. ui.click handlers
5. card.select / card.submit
6. game.win / game.lose
7. npm run build + manual checklist in sfx-design.md

DONE WHEN:
- sfx-design.md verification checklist passes
- npm run build passes
- No sfx imports under frontend/src/components/game/scene/
```

---

## Cross-references

- Screen UX & motion: [frontend-design.md](./frontend-design.md)
- Composable conventions: [frontend-patterns.md](./frontend-patterns.md)
- Stack / no extra deps: [frontend-stack.md](./frontend-stack.md)
- Roadmap slice: [roadmap.md](./roadmap.md#m616--sound-design)
