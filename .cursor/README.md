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

## Implementation Snapshot

**Last reviewed:** 2026-05-23

| Milestone | Status |
|---|---|
| M0 Scaffold | ✅ Done |
| M1 Domain engine | ✅ Done |
| M2 Infrastructure (Redis) | ✅ Done |
| M3 GraphQL API | ✅ Done |
| M4 Frontend core | ⬜ **Current focus** |
| M5 Playable MVP | ⬜ Blocked on M4 |

Partial implementations and blockers: [architecture-overview.md](./architecture-overview.md#known-gaps--mvp-blockers).

## Document Index

| File | Purpose | Read when… |
|---|---|---|
| [roadmap.md](./roadmap.md) | Milestones, task checklist, sprint order, MVP definition of done | Planning work, picking the next task |
| [architecture-overview.md](./architecture-overview.md) | System boundaries, data flow, layer responsibilities | Starting any feature or onboarding |
| [frontend-stack.md](./frontend-stack.md) | Locked-in frontend tooling and rationale | Frontend setup, dependency choices |
| [frontend-patterns.md](./frontend-patterns.md) | Vue composables, URQL usage, component contracts | Building views, components, or client logic |
| [frontend-design.md](./frontend-design.md) | Screens, wireframes, heuristics, motion, SFX, accessibility | Designing or implementing any UI surface |
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
7. **Dark table-top, vibrant cards** — Dark chrome with a moody felt background; vibrant color is reserved for card faces so the play surface carries the visual energy. Moderate motion micro-delights honor `prefers-reduced-motion`.

## Repository Layout

```
6-nimmt/
├── .cursor/              # This documentation
├── backend/
│   ├── app/
│   │   ├── config.py        # pydantic-settings (implemented)
│   │   ├── main.py          # FastAPI + Redis lifespan + GraphQL router (implemented)
│   │   ├── domain/          # Pure game logic — cards, rows, game, resolve, scoring (implemented)
│   │   ├── infrastructure/  # Redis client, sessions, rooms, game orchestration, pub/sub, timers (implemented)
│   │   └── graphql/         # Strawberry schema, resolvers, subscriptions, view builders (implemented)
│   ├── tests/               # 78 pytest (domain + infrastructure + graphql + openapi)
│   ├── openapi.yaml         # Contract reference (implemented ops documented)
│   ├── .env.example
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.vue          # Placeholder landing (M4 pending)
│   │   ├── main.ts
│   │   ├── style.css        # Tailwind v4 entry
│   │   ├── graphql/client.ts
│   │   ├── lib/guest-session.ts  # Read-only auth headers (M4 will write session)
│   │   ├── composables/  # planned
│   │   ├── components/   # planned
│   │   └── views/        # planned
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── .gitignore
```

## Local Setup

Prerequisites: Node 22+, Python 3.12+, Docker Desktop (for Postgres/Redis).

```bash
# Backend
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\pip install -e ".[dev]"
# Unix:    .venv/bin/pip install -e ".[dev]"
cp .env.example .env

# Frontend
cd frontend
npm install
cp .env.example .env
```

Run infrastructure + apps — see [deployment.md](./deployment.md).

## Implementation Order

See **[roadmap.md](./roadmap.md)** for the full checklist, milestones (M0–M7), and sprint plan. Critical path:

1. ~~`backend/app/domain/` — Pure game engine + unit tests~~ ✅
2. ~~Redis live-state layer + guest auth~~ ✅
3. ~~GraphQL queries, mutations, subscriptions~~ ✅
4. **Vue frontend: home → lobby → play** ← current
5. PostgreSQL persistence for completed matches (non-blocking for MVP; deps declared but unused)

**Testing:** Backend tests require Redis (`redis://localhost:6379/15` by default). Run `pytest` from `backend/` after `docker compose up redis` or full stack.
