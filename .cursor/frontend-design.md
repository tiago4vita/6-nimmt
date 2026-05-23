# Frontend Design

Single source of truth for **screen-level UX**, visual language, motion, and accessibility decisions for the 6-Nimmt Vue 3 SPA. Implementation conventions live in [frontend-patterns.md](./frontend-patterns.md); tooling lives in [frontend-stack.md](./frontend-stack.md).

## Locked Design Decisions

| Area | Choice |
|---|---|
| Theme | **Dark-first** — moody table-top, vibrant card faces |
| Responsive | **Desktop-first** — mobile shows a "best on larger screen" notice |
| Motion | **Moderate** — hover lift, staggered resolve, progress pulse |
| Board layout | **Vertical stack** — 4 horizontal rows |
| End-of-game | **Overlay on GameView** (primary); `/results` deep-link alias |
| Icons | **Lucide Vue** (`lucide-vue-next`) |
| Audio | **Optional SFX**, muted by default |

## Design System

### Surfaces & Chrome

```css
:root {
  --color-surface: #0c0c0f;        /* App background — near-black */
  --color-surface-raised: #16161a; /* Panels, player strip */
  --color-felt: #1a2e1a;           /* Subtle green tint behind board */
  --color-border: #2a2a32;
  --color-text: #f4f4f5;
  --color-muted: #a1a1aa;
  --color-accent: #d4a017;         /* Amber — table lamp / CTA accent */
  --color-danger: #ef4444;         /* Penalties, errors */
  --color-success: #22c55e;        /* Submitted, connected */
}
```

Typography: **Inter** (via `@fontsource/inter`) for headings and HUD; tabular numerals (`font-variant-numeric: tabular-nums`) for card values and scores so digits don't jitter on score animations.

In-game HUD uses at most **two font sizes** to preserve a calm reading hierarchy.

### Card Chroma (Vibrant, Value-Driven)

Card faces stay readable on dark felt via **hue bands** (predictable by value) and **bone intensity** (severity cue):

| Card range | Face hue | Tailwind sketch |
|---|---|---|
| 1–26 | Cool blue-violet | `from-indigo-500 to-violet-600` |
| 27–52 | Teal-green | `from-teal-500 to-emerald-600` |
| 53–78 | Amber-orange | `from-amber-500 to-orange-600` |
| 79–104 | Rose-red | `from-rose-500 to-red-600` |

| Bones | Indicator |
|---|---|
| 1 | Single dot, low opacity |
| 2 | Double dot |
| 3 (multiples of 10) | Triple dot |
| 5 (multiples of 11) | Solid ring outline |
| 7 (card 55) | Solid ring + soft pulse on hover |

`CardTile.vue` derives both via computed properties from `value` and `bones`. Numbers render white with a subtle inner shadow for a "physical tile" depth — bone severity shown as minimal dot/ring markers only.

## Nielsen Heuristics Coverage

Full gap analysis and implementation backlog: **[ux-audit.md](./ux-audit.md)**.

| # | Heuristic | Target UI (M6) | M6 status |
|---|---|---|---|
| 1 | Visibility of system status | `GameHudBar` (Round · Phase · Timer · Room), `PlayerStrip` highlights, submit-pending overlay, `LoadingShell` | Shipped |
| 2 | Match real world | Tabletop rows; icon-only SFX/Leave (`IconButton`); large card numbers | Shipped |
| 3 | User control & freedom | Select → `CardConfirmBar`; auto-submit selection on timeout; leave confirm | Shipped |
| 4 | Consistency & standards | `IconButton`, three button tiers (`.btn-primary/-secondary/-destructive`), unified errors | Shipped |
| 5 | Error prevention | Toasts with “More details”; 10s client mutation timeout + retry; confirm disabled while submitting | Shipped |
| 6 | Recognition over recall | Room code in HUD; player card highlights (no `N/M` counter); keyboard hint strip | Shipped |
| 7 | Flexibility & efficiency | `Esc` leave/cancel, `Enter` confirm, `1`–`N` quick select via `useGameShortcuts` | Shipped |
| 8 | Aesthetic & minimalist | Compact `GameHudBar`; icon-only chrome; no duplicate submitted-card banner | Shipped |
| 9 | Error recovery | Plain-language copy + retry action; `ConnectionStatusBanner` (WS + slow mutations) | Shipped |
| 10 | Help & documentation | Visual `RulesDrawer` with `CardTile` / mini `GameRow` examples | Shipped |

```mermaid
flowchart TB
  subgraph heuristics [Heuristic coverage]
    H1[Visibility of status]
    H2[Real-world metaphor]
    H3[User control]
    H4[Consistency]
    H5[Error prevention]
  end

  subgraph ui [UI surfaces]
    PhaseIndicator
    SubmitCountdown
    ReconnectBanner
    CardTile
    GameBoard
    PlayerStrip
    Toasts
    LeaveConfirm
  end

  H1 --> PhaseIndicator
  H1 --> SubmitCountdown
  H1 --> PlayerStrip
  H1 --> ReconnectBanner
  H2 --> CardTile
  H2 --> GameBoard
  H3 --> LeaveConfirm
  H4 --> CardTile
  H5 --> Toasts
```

## Screens

### 1. HomeView — `/`

Zero-friction entry: create or join a room without an account.

```
┌─────────────────────────────────────┐
│  6 Nimmt          [🔊]              │
│                                     │
│     ┌─────────────────────────┐     │
│     │  Your name              │     │
│     └─────────────────────────┘     │
│     [ Create room ]  (accent)       │
│                                     │
│     ─── or join ───                 │
│     ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │
│     │A │ │B │ │1 │ │2 │ │C │ │D │   │
│     └──┘ └──┘ └──┘ └──┘ └──┘ └──┘   │
│     [ Join room ]                   │
│                                     │
│     ▸ How to play                   │
└─────────────────────────────────────┘
```

- **Layout:** centered column, `max-w-md`.
- **Reactive:** `ensureGuestSession` boot spinner → skeleton name field; inline validation on empty name or invalid 6-char code.
- **Micro-delights:** Create button amber glow on hover; room-code inputs auto-advance focus on keystroke; successful join fades into Lobby (150ms).
- **Mobile:** Full-width `MobileDesktopNotice` banner: *"6 Nimmt is designed for desktop. You can browse, but gameplay works best on a larger screen."*

### 2. LobbyView — `/room/:roomId/lobby`

Social waiting room; host starts the game.

```
┌────────────────────────────────────────────────────────────┐
│ [←]        Room AB12CD    [Copy link]  [Copy code]         │
├──────────────────────────────┬─────────────────────────────┤
│  Players (4/10)              │  Waiting for host…          │
│  ● Alice  (host)             │                             │
│  ● You                       │  Min 2 players to start     │
│  ○ Bob    (away)             │                             │
│  [ Edit name ]               │  [ Start game ] (host only) │
│                              │  or "Host will start…"      │
└──────────────────────────────┴─────────────────────────────┘
```

- **Layout:** two-column on `lg+`, single column fallback.
- **Reactive:** `myGameViewUpdated` drives player list, `isConnected` dots, host badge; phase auto-navigates to `/play` once `phase >= SUBMIT`.
- **Micro-delights:** Copy code swaps the icon to Lucide `Check` + toast "Copied"; new player joins slide into the list (150ms); host's `Start game` button gains an amber pulse once at least 2 players are connected.

### 3. GameView — `/room/:roomId/play`

The core experience. Desktop-first vertical board.

```
┌────────────────────────────────────────────────────────────┐
│ Round 3/8 · SUBMIT · 0:24 left · AB12CD        [🔊]  [←]   │
├────────────────────────────────────────────────────────────┤
│  PlayerStrip: names · bones · submit highlight on cards  │
├────────────────────────────────────────────────────────────┤
│        ┌─ felt surface ──────────────────────────┐         │
│  Row 1 │ [12][19][24][31][38]                    │         │
│  Row 2 │ [7][15]                                 │         │
│  Row 3 │ [44][51][58]                            │         │
│  Row 4 │ [3][9]                                  │         │
│        └─────────────────────────────────────────┘         │
├────────────────────────────────────────────────────────────┤
│  Your hand (sorted ascending)                              │
│  [23] [47] [62] [88] [91] [97]   ← click select, then confirm │
│  [ Play card 47 ]  [ Cancel ]                              │
└────────────────────────────────────────────────────────────┘
```

- **Interaction model:** **Select → confirm.** Click selects (amber ring); confirm bar shows preview + “Play card N”. Hand locks while the mutation resolves (optimistic — see [frontend-patterns.md](./frontend-patterns.md#optimistic-submit-flow)). If the submit deadline hits with a card selected, the client submits it; otherwise the backend auto-plays the lowest card.
- **Rule C copy:** When the played card is lower than all row tails, surface a toast in the resolve feed: *"Card too low — auto-collected row with fewest bones."*
- **Transient phases (`DEAL`, `RESOLVE`, `SCORE`):** `GamePhaseOverlay` shows a shimmer + phase label to prevent interaction flash.

Reactive elements driven by the subscription payload:

| Signal | UI response |
|---|---|
| `phase === SUBMIT` | Enable hand; show `SubmitCountdown` from `room.submitDeadline` |
| `mySubmittedCard` set | Lock hand; highlight your player card in `PlayerStrip` (green border + check) |
| Opponent `hasSubmitted` | Highlight player card in `PlayerStrip` (green border); no card value leaked |
| Submit mutation pending | “Submitting…” on selected card; confirm disabled |
| Submit deadline (self) | Brief overlay: auto-play message before resolve |
| `lastResolvedPlays` | `ResolveFeed` staggers card → row arrow → bones badge (120ms/card) |
| Row affected | `GameRow` highlight: amber wash fade (200ms) |

### 4. Results Overlay — phase `FINISHED`

Primary end-game UX is an overlay on `GameView` (backdrop-blur, dimmed board). `/room/:roomId/results` exists as a shareable deep-link that mounts the same overlay over a frozen view.

```
┌─────────────────────────────────────┐
│           Game over                 │
│                                     │
│   🏆 Alice — 23 pts                 │
│      Bob   — 31 pts                 │
│      You   — 45 pts                 │
│                                     │
│  [ Back to lobby ]  [ Leave room ]  │
└─────────────────────────────────────┘
```

- **Micro-delights:** Winner row carries a subtle gold left border; score numbers count up (400ms). No confetti — stays in the minimalist register.
- **Ties:** Shared first place — both rows get the gold border and trophy icon.

## Motion Catalog

| Moment | Animation | Duration | Reduced-motion fallback |
|---|---|---|---|
| Card hover | `translateY(-4px)` + soft shadow | 150ms | Opacity change only |
| Card select | Amber ring scale-in | 120ms | Border color swap |
| Submit lock | Hand fades to `opacity: 0.5`; selected stays at 1 | 200ms | Instant state swap |
| Player submitted | Player card border flash (green) | 300ms | Static border |
| Countdown urgent | Timer color shift (amber → red) | 300ms | Static color |
| Resolve reveal | Stagger fade + slide per `ResolvedPlay` | 120ms × n | All at once |
| Row highlight | Background amber wash 10% → 0% | 200ms | 2px border flash |
| Copy code | Icon swap to `Check` | 200ms | Toast only |
| Bones increment | Tabular tick / flip on score number | 400ms | Instant replace |
| Player joins lobby | List item slide-in | 150ms | Static insert |

All transitions honor `@media (prefers-reduced-motion: reduce)` by swapping the column above. Color and state changes still happen so feedback is preserved.

## Optional SFX

Muted by default. Preference persists in `localStorage` (`sfxEnabled`) via `@vueuse/core` `useLocalStorage`. Never autoplay before the user opts in (browser autoplay policy compliance).

| Event | Character | Volume |
|---|---|---|
| Card select | Soft tap | Low |
| Submit confirm | Short chime | Low |
| Bones taken | Muted thud | Medium |
| Round resolve complete | Soft sweep | Low |
| Game won | Single warm note | Medium |

Assets live in `frontend/public/sfx/`. Triggered via the Web Audio API for minimal latency.

## Accessibility Checklist

- All card buttons expose `aria-pressed` when selected and `aria-disabled` while the hand is locked.
- Toasts use `role="status"` (info) or `role="alert"` (error).
- Reconnect banner uses `role="status"` + `aria-live="polite"`.
- Color is never the only signal — connection state pairs the dot color with text/title; penalties surface a number, not just red.
- Contrast: card numbers must hit WCAG AA against their gradient face (verify each hue band manually during implementation).
- Keyboard: `Tab` cycles the hand; `1`–`N` selects the nth visible card; `Enter` confirms the selected card; `Esc` clears selection or opens leave confirm; `Esc`/`Enter` on dialogs cancel/confirm.
- Focus rings are visible on dark surfaces — use the amber accent at 60% opacity.

## Component Tree Additions

These complement the existing list in [frontend-patterns.md](./frontend-patterns.md#directory-structure):

```
components/
  layout/
    AppShell.vue
    MobileDesktopNotice.vue
    SfxToggle.vue           # Icon-only; aria-label for on/off
    IconButton.vue          # Shared icon-only control + tooltip
    LoadingShell.vue        # Skeleton for Home / Lobby / Game boot
  lobby/
    RoomHeader.vue
    PlayerList.vue
    CopyRoomActions.vue
    RulesDrawer.vue         # Visual rules with CardTile + mini rows
  game/
    ResolveFeed.vue         # Staggers lastResolvedPlays
    SubmitCountdown.vue     # Driven by room.submitDeadline
    GamePhaseOverlay.vue    # DEAL / RESOLVE / SCORE / timeout auto-play
    ResultsOverlay.vue      # FINISHED modal
  feedback/
    ReconnectBanner.vue     # Evolve to ConnectionStatusBanner (WS + mutations)
    ToastHost.vue           # Expandable “More details” + optional retry action
    ConfirmDialog.vue
```

### Button tiers

| Tier | Use | Style |
|---|---|---|
| Primary | Create room, Start game, Play card | Amber fill |
| Secondary | Join room, Cancel, Copy | Border |
| Destructive | Confirm leave (dialog only) | Red fill |
| Icon | SFX, Leave, dismiss | Ghost + tooltip + `aria-label` |

## Cross-References

- Nielsen heuristic backlog: [ux-audit.md](./ux-audit.md)
- Vue conventions and composables: [frontend-patterns.md](./frontend-patterns.md)
- Tooling and dependencies: [frontend-stack.md](./frontend-stack.md)
- GraphQL types behind the reactive UI: [graphql-schema.md](./graphql-schema.md)
- Game rules driving phase copy and Rule C: [game-logic.md](./game-logic.md)
