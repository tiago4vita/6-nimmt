# 6-Nimmt — AI Context Documentation

This directory is the **single source of truth** for architecture, game rules, and implementation conventions. Before writing or modifying code, read the relevant documents below.

## Project Summary

**6-Nimmt** is an open-source, non-profit digital clone of the board card game *6 nimmt!* (Take 6). It targets board-game enthusiasts who expect a polished, minimalist UI and snappy multiplayer interactions.

| Decision | Choice |
|---|---|
| Frontend | Vue 3 + TypeScript + Vite + URQL + Tailwind CSS |
| Backend | FastAPI + Strawberry GraphQL + SQLModel + Redis |
| Auth (v1) | Anonymous guest sessions (UUID + token) |
| Deploy (v1) | Local Docker Compose only |

## Document Index

| File | Purpose | Read when… |
|---|---|---|
| [architecture-overview.md](./architecture-overview.md) | System boundaries, data flow, layer responsibilities | Starting any feature or onboarding |
| [frontend-stack.md](./frontend-stack.md) | Locked-in frontend tooling and rationale | Frontend setup, dependency choices |
| [frontend-patterns.md](./frontend-patterns.md) | Vue composables, URQL usage, UI conventions | Building views, components, or client logic |
| [game-logic.md](./game-logic.md) | Rules, phases, turn resolution, scoring | Backend game engine, validation, edge cases |
| [graphql-schema.md](./graphql-schema.md) | Types, queries, mutations, subscriptions, visibility rules | API design, resolvers, client operations |
| [state-management.md](./state-management.md) | Redis keys, pub/sub, reconnect, desync recovery | Live game state, WebSocket/subscription layer |
| [database-schema.md](./database-schema.md) | Persistent PostgreSQL models | Match history, stats, migrations |
| [auth.md](./auth.md) | Guest session lifecycle, headers, security | Identity, room join, reconnect |
| [deployment.md](./deployment.md) | Docker Compose services, env vars, local dev | Running the stack locally |

## Core Engineering Rules

1. **Documentation first** — Update these files when architecture changes, then implement.
2. **No information leakage** — Hidden cards must never appear in GraphQL fields visible to other players before turn resolution.
3. **Simultaneous actions** — All active players must submit before the placement algorithm runs.
4. **Async integrity** — Backend uses `async/await` throughout; no blocking I/O on the event loop.
5. **Strict typing** — Python type hints + TypeScript strict mode; avoid `any`.
6. **N+1 avoidance** — Use DataLoaders for relational GraphQL fields (e.g., player profiles in history).
7. **Minimalist UI** — Whitespace, typography, soft transitions; no flashy multi-color chrome.

## Repository Layout (Target)

```
6-nimmt/
├── .cursor/              # This documentation
├── backend/
│   ├── app/
│   │   ├── domain/       # Pure game logic (no I/O)
│   │   ├── graphql/      # Strawberry schema, resolvers, dataloaders
│   │   ├── infrastructure/  # Redis, PostgreSQL, pub/sub
│   │   └── main.py
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── composables/
│   │   ├── components/
│   │   ├── graphql/
│   │   └── views/
│   └── package.json
└── docker-compose.yml
```

## Implementation Order (Suggested)

1. `backend/app/domain/` — Pure game engine + unit tests
2. Redis live-state layer + GraphQL subscriptions
3. Guest auth + room lobby
4. Vue frontend: lobby → room → play
5. PostgreSQL persistence for completed matches (optional for MVP demo)
