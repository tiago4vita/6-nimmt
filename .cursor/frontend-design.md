# Frontend Design — BARE BONES

Single source of truth for **screen-level UX**, visual language, motion, and accessibility. Implementation conventions: [frontend-patterns.md](./frontend-patterns.md). Tokens: [design-tokens.md](./design-tokens.md).

---

## Locked design decisions

| Area | Choice |
|---|---|
| Theme | **Warm editorial** — light body (`#FFE7E0`), dark header (`#7D3623`), no CRT / console chrome |
| Identity | **Logotype** (`/Logotype.svg`) on header + home; wordmark not set in plain text |
| Player scope | **2-player showcase** — 1v1 duels (`SHOWCASE_MAX_PLAYERS = 2`) |
| Board | **TresJS/Three.js 3D table** — tilted camera, flat cards; 2D `CardTile` for HUD/rules |
| Responsive | **Desktop-first** — `MobileDesktopNotice` on small viewports |
| Motion | **Moderate** — existing motion queue + hand lift; respect `prefers-reduced-motion` |
| End-of-game | **Overlay on GameView**; `/results` deep-link alias |
| Icons | **Lucide Vue** (`lucide-vue-next`) |
| Audio | **Optional SFX**, muted by default (deferred) |

**Retired:** Wii / Xbox 360 light theme, cyan accent, CRT scanlines, value-based hue gradients, bone-tier particle effects.

---

## Design system

Full token tables: **[design-tokens.md](./design-tokens.md)**.

### Surfaces

| Surface | Background | Text |
|---|---|---|
| Header (`AppShell`) | `#7D3623` | `#FFE7E0` |
| Body / panels | `#FFE7E0` | `#7D3623` |
| 3D scene clear | `#FFE7E0` | — |

Borders: subtle `color-mix` of dark on light (~18%). Raised panels use border + spacing, not a second fill color.

### Typography

- **Inter** 400 (body) + 600 (accents).
- **Regular:** labels, helper copy, paragraphs, input text.
- **Bold:** page titles, button labels, HUD emphasis, card values.
- Tabular numerals on scores and timers.

### Card faces (bone-tier solids)

Background color = **`bones` count** (see [design-tokens.md](./design-tokens.md#card-face-colors-by-bone-count)). All card numerals and bone markers use `#FFE7E0`.

| Bones | Face color |
|---|---|
| 7 | `#7D3623` |
| 5 | `#3F237D` |
| 3 | `#237D62` |
| 2 | `#7D7723` |
| 1 | `#D29281` |

Flat fills only — no gradients, particles, or scanline shimmer. Severity reads from hue + bone number.

### Buttons

| Tier | Style |
|---|---|
| Primary | `#7D3623` fill, `#FFE7E0` **bold** text |
| Secondary | Transparent / light fill, `#7D3623` border + text |
| Destructive | Functional red fill (leave confirm) |
| Icon | Ghost on header (light icons on dark bar) |

Focus ring: dark at ~60% opacity on light surfaces.

---

## Screens

### 1. HomeView — `/`

```
┌─────────────────────────────────────┐
│ [Logotype.svg]              [🔊]    │  ← dark header
├─────────────────────────────────────┤
│                                     │
│         [ Logotype.svg ]            │  ← hero mark (larger)
│     Trick-avoidance card duel…      │  ← regular body copy
│                                     │
│     Your name                       │
│     [ input ]                       │
│     [ Create duel ]  (primary)      │
│     ─── or join ───                 │
│     [ code inputs ]                 │
│     [ Join room ]                   │
│     ▸ How to play                   │
└─────────────────────────────────────┘
```

### 2. LobbyView — `/room/:roomId/lobby`

Light panels, dark text, primary CTAs bold on dark fill. Host turn-timer slider unchanged functionally.

### 3. GameView — `/room/:roomId/play`

- Full-width 3D scene on `#FFE7E0` — **no CRT frame**.
- HUD (`GameHudBar`, `PlayerStrip`) — compact, light/translucent over scene.
- Select → confirm flow unchanged.

### 4. Results overlay

Light overlay, dark text, victory accent `#7D7723` (tier-2 gold). Rematch primary, exit secondary.

---

## Motion catalog

Keep shipped motion timings (hover lift, resolve stagger, bone pop). Update **colors only** to brand tokens — no cyan/orange bone-pop palette.

| Moment | Notes |
|---|---|
| Card hover / select | Y/Z lift via tween.js — selection ring `#7D3623` |
| Resolve feed | Stagger 120ms; row highlight warm wash from dark token |
| Bone pop | HTML overlay; tint from brand dark / tier colors |

All honor `prefers-reduced-motion`.

---

## Accessibility

- Card buttons: `aria-pressed`, `aria-disabled`.
- Toasts: `role="status"` / `role="alert"`.
- Contrast: `#FFE7E0` on tier faces — verify WCAG AA for each tier hex.
- Keyboard: `Tab`, `1`–`N`, `Enter`, `Esc` — unchanged.
- Logotype img: `alt="BARE BONES"`.

---

## Assets

| Path | Use |
|---|---|
| `/Logotype.svg` | Header + home hero |
| `/Logo.svg` | Mark / favicon source |
| `/favicon.ico` | Tab icon |

---

## Cross-references

- Tokens: [design-tokens.md](./design-tokens.md)
- Implementation plan: [visual-identity-implementation.md](./visual-identity-implementation.md)
- Vue patterns: [frontend-patterns.md](./frontend-patterns.md)
- UX audit backlog: [ux-audit.md](./ux-audit.md)
- Roadmap slice: [roadmap.md](./roadmap.md#m615--visual-identity-refresh-warm-editorial)
