# Visual Identity Implementation Plan

Branch: `frontend/new-visuals`  
Replaces: Wii / Xbox 360 / CRT / cyan-accent / value-hue-band direction.

**Read first:** [design-tokens.md](./design-tokens.md), [frontend-design.md](./frontend-design.md).

---

## Goals

1. Single warm editorial palette (`#7D3623` + `#FFE7E0`).
2. Card faces colored by **bone tier** (flat solids), all numerals `#FFE7E0`.
3. Header inverted (dark bar, light logotype); body light.
4. `Logotype.svg` on header + home.
5. Remove CRT / scanlines / Wii copy / cyan accent / gradient hue bands / `boneTierEffects` particles.
6. Preserve shipped gameplay UX (select→confirm, motion queue, shortcuts) — **visual-only refactor**.

---

## Phase 1 — Token foundation

| Task | Files |
|---|---|
| Replace `:root` tokens per [design-tokens.md](./design-tokens.md) | `frontend/src/style.css` |
| Extend `@theme` with new card tier + header tokens | `frontend/src/style.css` |
| Refactor `cardColors.ts`: `boneTierColor(bones)`, remove `hueBandForValue` / gradient classes | `frontend/src/lib/cardColors.ts` |
| Align scene fallbacks | `frontend/src/lib/scene/tokens.ts` |
| Bump `TEXTURE_VERSION` in `cardAppearance.ts` to bust caches | `frontend/src/lib/scene/cardAppearance.ts` |

**Acceptance:** No references to `--color-card-band-violet-*` etc. in CSS or TS.

---

## Phase 2 — 2D cards & rules UI

| Task | Files |
|---|---|
| `CardTile.vue` — flat `background-color: var(--color-card-tier-N)`, bold value, light text | `CardTile.vue` |
| `RulesDrawer` example cards use bone-tier colors | `RulesDrawer.vue` |
| Remove gradient Tailwind classes (`bg-gradient-to-br`, `cardTileGradientClass`) | `cardColors.ts`, `CardTile.vue` |

**Acceptance:** Cards 55 / 11 / 10 / 5 / 7 show distinct tier colors; all text `#FFE7E0`.

---

## Phase 3 — 3D card rendering

| Task | Files |
|---|---|
| `cardAppearance.ts` — solid fill from `boneTierColor(bones)`; drop linear gradients | `cardAppearance.ts` |
| Remove tier particles / shimmer / `boneTierEffects.ts` imports (file deleted) | `CardMesh.vue`, `stagingCardGroup.ts` |
| Card back = `#7D3623`; edge color from tokens | `cardAppearance.ts` |
| Selection emissive / rim uses `--color-dark`, not cyan | `CardMesh.vue`, lift hooks |

**Acceptance:** 3D row + hand cards match 2D tier colors; no GPU particles.

---

## Phase 4 — Chrome & layout

| Task | Files |
|---|---|
| `AppShell` — `bg-[var(--color-header-bg)]`, light logotype img, header controls light-colored | `AppShell.vue` |
| `HomeView` — centered `/Logotype.svg`, remove text h1; body copy regular weight | `HomeView.vue` |
| Buttons — primary: dark fill + light bold text; secondary: dark border on light ground | `style.css` (`.btn-*`) |
| Inputs — light bg, dark text, dark focus ring | `HomeView`, lobby forms |
| `index.html` favicon → `favicon.ico` | `index.html` |

**Acceptance:** Header/home match moodboard; no “BARE BONES” plain text where logotype should be.

---

## Phase 5 — Game scene & HUD

| Task | Files |
|---|---|
| Remove `.crt-game` wrapper class and any `#app::before` scanlines | `GameView.vue`, `style.css` |
| Scene clear + page bg both `#FFE7E0` | `GameScene.vue`, `tokens.ts` |
| Retune contact shadow to warm brown | `TableSurface.vue` / shadow component |
| `GameHudBar`, `PlayerStrip`, overlays — dark text on light/translucent panels | HUD components |
| `BonePop.vue` — player colors from brand tokens (not cyan/orange) | `BonePop.vue` |
| `LoadingShell` skeleton colors | `LoadingShell.vue` |

**Acceptance:** Game view feels continuous with shell; no CRT box; no cyan UI chrome.

---

## Phase 6 — Cleanup & docs

| Task | Files |
|---|---|
| Grep purge: `0099cc`, `crt-game`, `Wii`, `Balatro` (comments OK to simplify) | `frontend/src/**` |
| Update `.cursor` docs (done in this PR) | `.cursor/*` |
| `npm run build` + manual two-browser smoke | — |

---

## Out of scope (this pass)

- Gameplay / GraphQL / backend changes
- New animations (keep existing motion queue)
- Dark mode toggle
- SFX
- 3+ players

---

## Verification checklist

- [ ] Header uses `Logotype.svg` on `#7D3623` bar
- [ ] Home hero uses `Logotype.svg`
- [ ] Body background `#FFE7E0`, body text `#7D3623`
- [ ] Card 55 face `#7D3623`, card 1 face `#D29281`, text `#FFE7E0` on all
- [ ] No CRT scanlines
- [ ] No cyan `#0099cc` in CSS or TS fallbacks
- [ ] `npm run build` passes
- [ ] Reduced-motion still works

---

## Agent handoff

Copy the prompt from [roadmap.md](./roadmap.md#agent-prompt-visual-identity-refresh) or the **Detailed agent prompt** section at the bottom of this file when starting implementation.

### Detailed agent prompt

```
You are implementing the BARE BONES visual identity refresh on branch frontend/new-visuals.

READ FIRST (mandatory):
- .cursor/design-tokens.md
- .cursor/visual-identity-implementation.md
- .cursor/frontend-design.md

DESIGN RULES (locked):
- Brand dark: #7D3623 — header background, body text, primary button fill
- Brand light: #FFE7E0 — header text, body background, scene/canvas clear
- Typography: regular (400) for body/labels; bold (600–700) for headings, CTAs, card values
- Card BACKGROUND by bones count (flat solid, no gradients):
  - 7 bones → #7D3623
  - 5 bones → #3F237D
  - 3 bones → #237D62
  - 2 bones → #7D7723
  - 1 bone  → #D29281
- All card text/markers: #FFE7E0
- Assets: use /Logotype.svg in AppShell header and HomeView hero (frontend/public/Logotype.svg)
- Logo.svg / favicon.ico for browser tab

RETIRE (remove, do not preserve):
- Wii / Xbox 360 / CRT / scanline aesthetic (.crt-game, #app::before overlays)
- Cyan accent #0099cc
- Value-based hue bands (violet/teal/amber/rose gradients)
- boneTierEffects.ts particles / shimmer tiers — deleted; use flat tier colors only

IMPLEMENTATION ORDER:
1. style.css :root + @theme tokens (design-tokens.md skeleton)
2. cardColors.ts → boneTierColor(bones); remove hueBandForValue / cardTileGradientClass
3. cardAppearance.ts — solid fills, bump TEXTURE_VERSION
4. CardTile.vue — flat tier background
5. AppShell.vue + HomeView.vue — Logotype.svg, inverted header
6. GameView.vue — remove .crt-game wrapper; scene clear #FFE7E0
7. scene/tokens.ts fallbacks; CardMesh selection rim dark not cyan
8. BonePop, buttons, HUD — re-tokenize accents
9. Grep cleanup; npm run build

CONSTRAINTS:
- Do NOT change game logic, GraphQL, composable behavior, or motion queue semantics
- Preserve accessibility: aria labels, keyboard shortcuts, reduced-motion
- Minimize scope — visual/CSS/material changes only
- Match existing code conventions (script setup, Tailwind v4, @/ aliases)
- Do not commit unrelated files (package-lock.json at repo root unless asked)

DONE WHEN:
- Verification checklist in visual-identity-implementation.md is satisfied
- npm run build passes
- No stale Wii/cyan/hue-band tokens remain in frontend/src
```
