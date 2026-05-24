# Frontend Stack

## Current scaffold status

**Last reviewed:** 2026-05-23 (`cursor/m4-frontend-core`)

| Item | Status |
|---|---|
| Vite + Vue 3 + TypeScript + Tailwind v4 | ✅ Wired |
| URQL HTTP + WebSocket client | ✅ `src/graphql/client.ts` + `connection.ts` (WS lifecycle) |
| Auth headers from localStorage | ✅ `src/lib/guest-session.ts` read/write |
| `ensureGuestSession` / GraphQL operations | ✅ `useGuestSession` + `operations.ts` |
| Vue Router | ✅ `src/router/index.ts` — Home, Lobby, Game, Results |
| `@vueuse/core` | ✅ `useLocalStorage` in SfxToggle |
| Design system (Inter, Lucide, dark theme) | ✅ M4 baseline (M6 polish pending) |
| `App.vue` | ✅ Router shell; session boot via router guard only |

## Locked-In Decisions

| Category | Choice | Version policy |
|---|---|---|
| Framework | **Vue 3** (Composition API, `<script setup>`) | Latest stable 3.x |
| Language | **TypeScript** | `strict: true` |
| Build tool | **Vite** | Latest stable |
| GraphQL client | **URQL** | `@urql/vue` + `@urql/exchange-graphcache` (optional) |
| Styling | **Tailwind CSS** | v4 via `@tailwindcss/vite` |
| Icons | **Lucide Vue** (`lucide-vue-next`) | Latest stable |
| Fonts | **Inter** via `@fontsource/inter` | Latest stable |

## Why This Stack

### Vue 3 over React

- Smaller runtime bundle for a focused SPA
- Less boilerplate for a solo/portfolio codebase
- Composition API maps cleanly to game composables (`useGameRoom`, `useGuestSession`)
- Sufficient hiring signal when paired with GraphQL + real-time subscriptions

### URQL over Apollo Client

- ~8–12 KB vs Apollo's heavier client + normalized cache
- Live game state is **subscription-driven**; server (Redis) is source of truth
- Queries are mostly lobby/history; mutations are few (`joinRoom`, `submitCard`, `startGame`)
- Apollo's normalized cache adds complexity without proportional benefit in v1

### Tailwind CSS

- Matches minimalist, typography-first UI goal
- Rapid layout iteration for card grid and row display
- Design tokens via CSS variables in `src/style.css` (Tailwind v4 — no separate `tailwind.config` required for v1)

## Installed Dependencies

As declared in `frontend/package.json`:

```json
{
  "dependencies": {
    "vue": "^3.5.x",
    "vue-router": "^4.5.x",
    "@urql/vue": "^1.4.x",
    "graphql": "^16.x",
    "graphql-ws": "^5.x",
    "@vueuse/core": "^11.x"
  },
  "devDependencies": {
    "typescript": "~5.7.x",
    "vite": "^6.x",
    "@vitejs/plugin-vue": "^5.x",
    "vue-tsc": "^2.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/vite": "^4.x"
  }
}
```

### Pending Design-System Additions

Install when the design system lands (see [frontend-design.md](./frontend-design.md)):

```bash
npm install lucide-vue-next @fontsource/inter
```

| Package | Purpose |
|---|---|
| `lucide-vue-next` | Icon set — locked choice over Heroicons for thinner strokes that pair with Inter on dark surfaces |
| `@fontsource/inter` | Self-hosted Inter font; imported once in `src/main.ts` (`import '@fontsource/inter/400.css'` and `/600.css`) |

### `@vueuse/core` — Use Sparingly

Allowed:

- `useLocalStorage` for guest session persistence
- `useLocalStorage` for the `sfxEnabled` preference (key: `nimmt:sfxEnabled`, default `false`)

Avoid importing the full utility catalog; keep dependencies lean.

## GraphQL Code Generation

Use **GraphQL Code Generator** (`@graphql-codegen/cli`) to produce typed operations from the backend schema.

```
frontend/
  codegen.ts
  src/graphql/
    generated/       # gitignored or committed — team choice: commit for CI simplicity
    operations/
      room.graphql
      game.graphql
```

Benefits: no hand-written `any` on mutation variables; subscription payloads typed end-to-end.

## URQL Client Setup (Implemented)

`src/graphql/client.ts` — HTTP + WebSocket exchanges with env fallbacks for local dev.

`src/main.ts` — register the Vue plugin with a **default import**:

```typescript
import urql from '@urql/vue'
import { urqlClient } from './graphql/client'

createApp(App).use(urql, urqlClient).mount('#app')
```

Reference client configuration:

```typescript
// src/graphql/client.ts
import { createClient, subscriptionExchange, fetchExchange } from '@urql/vue'
import { createClient as createWsClient } from 'graphql-ws'

import { getAuthHeaders } from '../lib/guest-session'

const httpUrl = import.meta.env.VITE_GRAPHQL_HTTP_URL ?? 'http://localhost:8000/graphql'
const wsUrl = import.meta.env.VITE_GRAPHQL_WS_URL ?? 'ws://localhost:8000/graphql'

const wsClient = createWsClient({
  url: wsUrl,
  connectionParams: () => getAuthHeaders(),
})

export const urqlClient = createClient({
  url: httpUrl,
  fetchOptions: () => ({
    headers: getAuthHeaders(),
  }),
  exchanges: [
    fetchExchange,
    subscriptionExchange({
      forwardSubscription: (operation) => ({
        subscribe: (sink) => ({
          unsubscribe: wsClient.subscribe(
            { ...operation, query: operation.query ?? '' },
            sink,
          ),
        }),
      }),
    }),
  ],
})
```

Tailwind v4 entry in `src/style.css`:

```css
@import "tailwindcss";
```

Vite plugins in `vite.config.ts`: `@vitejs/plugin-vue`, `@tailwindcss/vite`.

## Environment Variables

| Variable | Example | Purpose |
|---|---|---|
| `VITE_GRAPHQL_HTTP_URL` | `http://localhost:8000/graphql` | Queries & mutations |
| `VITE_GRAPHQL_WS_URL` | `ws://localhost:8000/graphql` | Subscriptions |

## Explicit Non-Choices

| Alternative | Reason rejected (v1) |
|---|---|
| Apollo Client | Overkill for subscription-first state |
| Pinia for live game | Duplicates subscription payload; use composable + refs |
| Nuxt | SSR unnecessary for portfolio SPA |
| UI component libraries (Vuetify, Element) | Conflicts with minimalist custom card UI |
| CSS Modules / Styled Components | Tailwind is the standard here |

## Cross-References

- Screen UX, wireframes, design tokens: [frontend-design.md](./frontend-design.md)
- Component & composable patterns: [frontend-patterns.md](./frontend-patterns.md)
- API operations: [graphql-schema.md](./graphql-schema.md)
- Docker env wiring: [deployment.md](./deployment.md)
