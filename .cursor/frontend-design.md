# Frontend Design

Single source of truth for **screen-level UX**, visual language, motion, and accessibility decisions for the BARE BONES Vue 3 SPA. Implementation conventions live in [frontend-patterns.md](./frontend-patterns.md); tooling lives in [frontend-stack.md](./frontend-stack.md).

## Locked Design Decisions

| Area | Choice |
|---|---|
| Theme | **Light-first (Wii / Xbox 360)** — off-white surfaces, cyan accent, subtle CRT scanlines |
| Player scope | **2-player showcase** — 1v1 duels only until multi-player visuals scale (M6.14) |
| Board | **TresJS/Three.js 3D table** — tilted camera, flat cards on felt; 2D `CardTile` kept for rules/HUD |
| Responsive | **Desktop-first** — mobile shows a "best on larger screen" notice |
| Motion | **Moderate** — hover lift, staged resolve, progress pulse; `@tweenjs/tween.js` for 3D hand |
| End-of-game | **Overlay on GameView** (primary); `/results` deep-link alias |
| Icons | **Lucide Vue** (`lucide-vue-next`) |
| Audio | **Optional SFX**, muted by default |

## Design System

### Surfaces & Chrome

```css
:root {
  --color-surface: #f2f0eb;        /* App background — warm off-white */
  --color-surface-raised: #ffffff; /* Panels, player strip */
  --color-felt: #fafafa;           /* 3D table / canvas backdrop */
  --color-border: #d4d0c8;
  --color-text: #2a2a2a;
  --color-muted: #6b6b6b;
  --color-accent: #0099cc;         /* Cyan — Wii-style CTA accent */
  --color-accent-warm: #e85d04;    /* Resolve highlights, urgent timer */
  --color-danger: #ef4444;
  --color-success: #4caf50;
}
```

**CRT treatment:** `.crt-game` viewport wrapper + global `#app::before` scanline overlay (`mix-blend-mode: multiply`) for a low-res console feel without harming readability.

Typography: **Inter** (via `@fontsource/inter`) for headings and HUD; tabular numerals (`font-variant-numeric: tabular-nums`) for card values and scores so digits don't jitter on score animations.

In-game HUD uses at most **two font sizes** to preserve a calm reading hierarchy.

### Card Chroma (Vibrant, Value-Driven)

Card faces stay readable on the light table via **hue bands** (predictable by value) and **bone intensity** (severity cue). Same chroma rules apply to 2D `CardTile` and 3D `CardMesh` face materials.

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
│  BARE BONES       [🔊]              │
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
- **Mobile:** Full-width `MobileDesktopNotice` banner: *"BARE BONES is designed for desktop. You can browse, but gameplay works best on a larger screen."*

### 2. LobbyView — `/room/:roomId/lobby`

1v1 duel waiting room; host starts when both players are seated.

```
┌────────────────────────────────────────────────────────────┐
│ [←]        Room AB12CD    [Copy link]  [Copy code]         │
├──────────────────────────────┬─────────────────────────────┤
│  Duelists (2/2)              │  Ready to duel?             │
│  ● Alice  (host)             │                             │
│  ● You                       │  Turn timer  [====●===] 30s │
│  [ Edit name ]               │  (host slider: 3–60s)       │
│                              │  [ Start duel ] (host only) │
│                              │  or "Host will start…"      │
└──────────────────────────────┴─────────────────────────────┘
```

- **Layout:** two-column on `lg+`, single column fallback.
- **Reactive:** `myGameViewUpdated` drives player list, `isConnected` dots, host badge; phase auto-navigates to `/play` once `phase >= SUBMIT`.
- **Turn timer:** Host adjusts `submitTimeoutSeconds` (3–60, default 30) via range slider; synced to all lobby clients via subscription. Guests see read-only “Turn timer: Ns per round”.
- **Micro-delights:** Copy code swaps the icon to Lucide `Check` + toast "Copied"; opponent joins slide into the list (150ms); host's `Start duel` button gains a cyan pulse once both duelists are connected.
- **Capacity:** `SHOWCASE_MAX_PLAYERS = 2` — third join attempt returns `ROOM_FULL`.

### 3. GameView — `/room/:roomId/play`

The core experience. **3D table scene** inside `.crt-game` viewport; HUD and confirm bar remain HTML overlays for accessibility.

```
┌────────────────────────────────────────────────────────────┐
│ Round 3/8 · SUBMIT · 0:24 left · AB12CD        [🔊]  [←]   │
├────────────────────────────────────────────────────────────┤
│  PlayerStrip: names · bones · submit highlight on cards  │
├────────────────────────────────────────────────────────────┤
│        ┌─ .crt-game / GameScene (TresCanvas) ──────┐         │
│        │  (3D table — rows, hand fan, animations)  │         │
│        └───────────────────────────────────────────┘         │
├────────────────────────────────────────────────────────────┤
│  CardConfirmBar (HTML overlay — select → confirm)          │
└────────────────────────────────────────────────────────────┘
```

- **Interaction model:** **Select → confirm.** Click selects (cyan ring); confirm bar shows preview + “Play card N”. Hand locks while the mutation resolves (optimistic — see [frontend-patterns.md](./frontend-patterns.md#optimistic-submit-flow)). If the submit deadline hits with a card selected, the client submits it; otherwise the backend auto-plays the lowest card.
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
│  🏆 Final scores / Shared victory     │
│  Tie at 4 bones — Alice & Bob         │
│                                     │
│  #1 🏆 Alice — 4 bones              │
│  #1 🏆 Bob   — 4 bones              │
│      You   — 12 bones               │
│                                     │
│  [ Rematch ]  [ Exit room ]         │
└─────────────────────────────────────┘
```

- **Primary action:** **Rematch** (accent) — calls `returnToLobby`, navigates to lobby for a new game.
- **Secondary action:** **Exit room** (neutral) — `leaveRoom` + home.
- **Micro-delights:** Winner row carries a subtle gold left border; tied winners share rank `#1`. No confetti — stays in the minimalist register.
- **Ties:** Title becomes “Shared victory”; both winner rows get gold left border + per-row trophy icon; ranks use competition ranking (1, 1, 3…).

## Motion Catalog

| Moment | Animation | Duration | Reduced-motion fallback |
|---|---|---|---|
| Card hover | `translateY(-4px)` + soft shadow | 150ms | Opacity change only |
| Card select | Cyan ring scale-in | 120ms | Border color swap |
| Submit lock | Hand fades to `opacity: 0.5`; selected stays at 1 | 200ms | Instant state swap |
| Player submitted | Player card border flash (green) | 300ms | Static border |
| Countdown urgent | Timer color shift (amber → red) | 300ms | Static color |
| Resolve reveal | Stagger fade + slide per `ResolvedPlay` | 120ms × n | All at once |
| Row highlight | Background warm wash 10% → 0% | 200ms | 2px border flash |
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
- Focus rings are visible on light surfaces — use the cyan accent at 60% opacity.

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
| Primary | Create duel, Start duel, Play card | Cyan fill |
| Secondary | Join room, Cancel, Copy | Border |
| Destructive | Confirm leave (dialog only) | Red fill |
| Icon | SFX, Leave, dismiss | Ghost + tooltip + `aria-label` |

## Cross-References

- Nielsen heuristic backlog: [ux-audit.md](./ux-audit.md)
- Vue conventions and composables: [frontend-patterns.md](./frontend-patterns.md)
- Tooling and dependencies: [frontend-stack.md](./frontend-stack.md)
- GraphQL types behind the reactive UI: [graphql-schema.md](./graphql-schema.md)
- Game rules driving phase copy and Rule C: [game-logic.md](./game-logic.md)
