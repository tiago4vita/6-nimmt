# Frontend Stack

## Locked-In Decisions

| Category | Choice | Version policy |
|---|---|---|
| Framework | **Vue 3** (Composition API, `<script setup>`) | Latest stable 3.x |
| Language | **TypeScript** | `strict: true` |
| Build tool | **Vite** | Latest stable |
| GraphQL client | **URQL** | `@urql/vue` + `@urql/exchange-graphcache` (optional) |
| Styling | **Tailwind CSS** | v4 or v3 per project init |
| Icons | Lucide Vue or Heroicons (pick one, stay consistent) | — |

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
- Design tokens via `tailwind.config` (spacing, neutrals, one accent)

## Dependencies (Target)

```json
{
  "dependencies": {
    "vue": "^3.x",
    "vue-router": "^4.x",
    "@urql/vue": "^1.x",
    "graphql": "^16.x",
    "graphql-ws": "^5.x",
    "@vueuse/core": "^11.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^6.x",
    "@vitejs/plugin-vue": "^5.x",
    "tailwindcss": "^4.x",
    "graphql-codegen": "optional — see below"
  }
}
```

### `@vueuse/core` — Use Sparingly

Allowed:

- `useLocalStorage` for guest session persistence

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

## URQL Client Setup (Reference)

```typescript
// src/graphql/client.ts
import { createClient, subscriptionExchange, fetchExchange } from '@urql/vue';
import { createClient as createWsClient } from 'graphql-ws';

const wsClient = createWsClient({
  url: import.meta.env.VITE_GRAPHQL_WS_URL,
  connectionParams: () => ({
    authorization: `Bearer ${localStorage.getItem('guestToken')}`,
  }),
});

export const urqlClient = createClient({
  url: import.meta.env.VITE_GRAPHQL_HTTP_URL,
  fetchOptions: () => ({
    headers: {
      authorization: `Bearer ${localStorage.getItem('guestToken')}`,
    },
  }),
  exchanges: [
    fetchExchange,
    subscriptionExchange({
      forwardSubscription: (operation) => ({
        subscribe: (sink) => ({
          unsubscribe: wsClient.subscribe(
            { ...operation, query: operation.query || '' },
            sink
          ),
        }),
      }),
    }),
  ],
});
```

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

- Component & composable patterns: [frontend-patterns.md](./frontend-patterns.md)
- API operations: [graphql-schema.md](./graphql-schema.md)
- Docker env wiring: [deployment.md](./deployment.md)
