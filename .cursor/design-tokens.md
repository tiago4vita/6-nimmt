# Design Tokens — BARE BONES

Canonical color, typography, and asset tokens for the **warm editorial** visual identity. This replaces the retired Wii / Xbox 360 / CRT direction.

**Implementation source of truth:** `frontend/src/style.css` (`:root` + `@theme`).  
**Runtime readers:** `frontend/src/lib/cardColors.ts`, `frontend/src/lib/scene/tokens.ts`.

---

## Brand palette

| Token | Hex | Role |
|---|---|---|
| `--color-dark` | `#7D3623` | Header background, body text, primary buttons (fill) |
| `--color-light` | `#FFE7E0` | Header text, body background, scene/canvas clear color, card numerals |

Semantic aliases (map to brand palette — do not introduce unrelated hues):

| Semantic token | Maps to | Usage |
|---|---|---|
| `--color-surface` | `--color-light` | Page / app background |
| `--color-surface-raised` | `--color-light` | Panels on light ground (use border for separation) |
| `--color-text` | `--color-dark` | Primary copy, labels |
| `--color-muted` | `#7D3623` at ~65% opacity | Secondary copy (use `color-mix` or dedicated token) |
| `--color-border` | `#7D3623` at ~18% opacity | Dividers, input borders |
| `--color-header-bg` | `--color-dark` | `AppShell` header bar |
| `--color-header-text` | `--color-light` | Header links, logotype area |
| `--color-scene-clear` | `--color-light` | TresJS / WebGL clear color |

**Retired (remove from code):** cyan accent (`#0099cc`), off-white Wii surfaces (`#f2f0eb`), CRT scanlines, value-based hue bands (violet/teal/amber/rose gradients).

---

## Typography

| Role | Weight | Tailwind / CSS |
|---|---|---|
| Body, labels, inputs | **Regular (400)** | `font-normal`, Inter 400 |
| Accents — headings, CTAs, HUD emphasis, card values | **Bold (600–700)** | `font-semibold` / `font-bold`, Inter 600 |

Rules:

- Headlines and button labels: **bold**.
- Helper text, paragraphs, form labels: **regular**.
- Card face numerals (2D + 3D): **bold** (`700`), color `--color-card-face-text`.
- Tabular numerals on scores and timers: `font-variant-numeric: tabular-nums`.

Font family: **Inter** via `@fontsource/inter` (400 + 600 minimum).

---

## Card face colors (by bone count)

Card background is determined by **`bones`**, not card `value`. Higher bones → earlier colors in the list (more severe).

| Bones | Game rule | Face background token | Hex |
|---|---|---|---|
| **7** | Card 55 | `--color-card-tier-7` | `#7D3623` |
| **5** | Multiples of 11 (except 55) | `--color-card-tier-5` | `#3F237D` |
| **3** | Multiples of 10 | `--color-card-tier-3` | `#237D62` |
| **2** | Multiples of 5 (not caught above) | `--color-card-tier-2` | `#7D7723` |
| **1** | All others | `--color-card-tier-1` | `#D29281` |

| Token | Hex | Role |
|---|---|---|
| `--color-card-face-text` | `#FFE7E0` | Value + bone marker on all tiers |
| `--color-card-back` | `#7D3623` | Card back (3D + rules drawer) |
| `--color-card-edge` | `#7D3623` | Mesh edge / subtle depth |

**Rendering:** flat solid fills — **no gradients**, no tier particles, no scanline shimmer.  
**Mapping function:** `boneTierColor(bones: number): string` in `cardColors.ts` (switch on 7 / 5 / 3 / 2 / default 1).

---

## Interactive & feedback colors

Keep functional semantics; tint with brand where possible:

| Token | Suggested value | Usage |
|---|---|---|
| `--color-accent` | `#7D3623` | Focus rings, selected card ring, primary CTA fill |
| `--color-accent-foreground` | `#FFE7E0` | Text on primary buttons |
| `--color-danger` | `#B91C1C` | Errors, destructive confirm (unchanged functional red) |
| `--color-success` | `#237D62` | Submitted / connected (reuse tier-3 green) |
| `--color-victory-gold` | `#7D7723` | Winner highlight (reuse tier-2 gold) |

Selection ring on cards: `--color-dark` or `--color-light` border with 2px offset — must read on both light page and colored card faces.

---

## Assets (`frontend/public/`)

| File | Usage |
|---|---|
| `Logotype.svg` | **Header** (`AppShell`) and **Home** hero — replace text “BARE BONES” |
| `Logo.svg` | App mark / favicon source (`favicon.ico` derived from brand) |
| `favicon.ico` | Browser tab icon |

### Logotype usage

- Header: `<img src="/Logotype.svg" alt="BARE BONES" />` inside dark bar; height ~20–28px, preserve aspect ratio.
- Home: centered above tagline; height ~32–48px.
- Do not recolor the SVG in CSS unless adding a monochrome variant — asset already uses `#7D3623` / `#FFE7E0`.

---

## Scene / 3D

| Setting | Value |
|---|---|
| Clear color | `#FFE7E0` (`--color-scene-clear`) |
| Contact shadow | warm brown, low opacity (derive from `#7D3623`) |
| Accent emissive (selected card) | `#7D3623` — replace cyan rim |
| CRT wrapper | **Remove** — no `.crt-game` scanlines |

---

## CSS skeleton (paste into `style.css`)

```css
:root {
  --color-dark: #7d3623;
  --color-light: #ffe7e0;

  --color-surface: var(--color-light);
  --color-surface-raised: var(--color-light);
  --color-text: var(--color-dark);
  --color-muted: color-mix(in srgb, var(--color-dark) 65%, transparent);
  --color-border: color-mix(in srgb, var(--color-dark) 18%, transparent);

  --color-header-bg: var(--color-dark);
  --color-header-text: var(--color-light);

  --color-accent: var(--color-dark);
  --color-accent-foreground: var(--color-light);

  --color-card-tier-7: #7d3623;
  --color-card-tier-5: #3f237d;
  --color-card-tier-3: #237d62;
  --color-card-tier-2: #7d7723;
  --color-card-tier-1: #d29281;
  --color-card-face-text: #ffe7e0;
  --color-card-back: #7d3623;
  --color-card-edge: #7d3623;

  --color-scene-clear: var(--color-light);
  /* … danger, success, shadow tokens … */
}
```

Mirror every `--color-*` used in `@theme { }` for Tailwind utilities (`bg-surface`, `text-text`, etc.).

---

## Cross-references

- Screen UX & component tree: [frontend-design.md](./frontend-design.md)
- Vue token consumption: [frontend-patterns.md](./frontend-patterns.md)
- Implementation checklist: [visual-identity-implementation.md](./visual-identity-implementation.md)
- Roadmap slice: [roadmap.md](./roadmap.md#m615--visual-identity-refresh-warm-editorial)
