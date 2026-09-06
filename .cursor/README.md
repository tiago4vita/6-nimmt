# BARE BONES — Project & AI Context

**Author:** Tiago Vita

This directory is the **single source of truth** for architecture, game rules, and implementation conventions. Before writing or modifying code, read the relevant documents below.

## What is BARE BONES?

**BARE BONES** is an open-source, non-profit browser game inspired by the board card game *6 nimmt!* (*Take 6*). Players try to avoid collecting **bones** (penalty points) while placing numbered cards on four ascending rows. The player with the **fewest bones** at the end wins.

The product name and visual identity are original; mechanics follow the well-known trick-avoidance rules documented in [game-logic.md](./game-logic.md).

### Core loop (player-facing)

1. **Lobby** — Create or join a room with a code; host sets options and starts when enough players are ready.
2. **Deal** — Each player receives a hand; four starter cards seed the rows.
3. **Submit** — Each round, pick one card secretly; the game waits until everyone has submitted.
4. **Resolve** — Cards are revealed in ascending order and placed on rows (or rows are taken as penalties).
5. **Repeat** until hands are empty, then show **results** (lowest bones wins).

No account is required: anonymous **guest sessions** (UUID + token in browser storage) identify players for the session.

## Tech choices

| Decision | Choice |
| --- | --- |
| Frontend | Vue 3 + TypeScript + Vite + URQL + Tailwind CSS + TresJS |
| Backend | FastAPI + Strawberry GraphQL + SQLModel + Redis |
| Auth (v1) | Anonymous guest sessions |
| Deploy (v1) | Local Docker Compose |

## How to run the project

### Option A — Docker Compose (recommended for demos)

Prerequisites: Docker Desktop.

```bash
# From repository root
docker compose --env-file .env.local up --build
```

Open **http://localhost:5173**. GraphQL and health: **http://localhost:8000/graphql**, **http://localhost:8000/docs**.

For LAN play with friends, use `.env.lan` and `docker compose --env-file .env.lan up --build` — see [deployment.md](./deployment.md).

### Option B — Native apps + Docker for data stores

Prerequisites: Node 22+, Python 3.12+, Docker for Postgres/Redis.

```bash
docker compose up postgres redis -d

# Backend
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\pip install -e ".[dev]"
# Unix:    .venv/bin/pip install -e ".[dev]"
cp .env.example .env
# Windows: .\.venv\Scripts\uvicorn.exe app.main:app --reload
# Unix:    .venv/bin/uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

**Backend tests** need Redis: `docker compose up redis -d`, then `cd backend && python -m pytest`.

Portfolio-facing summary also lives in the root [README.md](../README.md).

## Implementation snapshot

**Last reviewed:** 2026-09-06

| Milestone | Status |
| --- | --- |
| M0 Scaffold | Done |
| M1 Domain engine | Done |
| M2 Infrastructure | Done |
| M3 GraphQL API | Done |
| M4 Frontend core | Done |
| M5 Playable MVP | Done |
| M6 Polish | In progress — **M6.15 visual identity** ([design-tokens.md](./design-tokens.md)) |
| M7 Post-MVP | Backlog |

Partial implementations and blockers: [architecture-overview.md](./architecture-overview.md#known-gaps--mvp-blockers).

## Document index

| File | Purpose | Read when… |
| --- | --- | --- |
| [roadmap.md](./roadmap.md) | Milestones, task checklist, sprint order | Planning work |
| [design-tokens.md](./design-tokens.md) | Colors, typography, card tiers, assets | Styling, M6.15 visual refresh |
| [visual-identity-implementation.md](./visual-identity-implementation.md) | Phased implementation + agent prompt | Executing visual identity work |
| [architecture-overview.md](./architecture-overview.md) | System boundaries, data flow | Starting any feature |
| [frontend-stack.md](./frontend-stack.md) | Frontend tooling | Setup, dependencies |
| [frontend-patterns.md](./frontend-patterns.md) | Vue composables, URQL | Components, client logic |
| [frontend-design.md](./frontend-design.md) | Screens, motion, accessibility | UI surfaces |
| [ux-audit.md](./ux-audit.md) | UX backlog | Polish sprint |
| [game-logic.md](./game-logic.md) | Rules, phases, scoring | Game engine, validation |
| [graphql-schema.md](./graphql-schema.md) | GraphQL types & operations | API, resolvers |
| [state-management.md](./state-management.md) | Redis keys, pub/sub | Live game state |
| [database-schema.md](./database-schema.md) | PostgreSQL models | Persistence |
| [auth.md](./auth.md) | Guest sessions | Identity, reconnect |
| [deployment.md](./deployment.md) | Docker Compose, env vars | Running locally |

## Engineering rules

1. **Documentation first** — Update these files when architecture changes, then implement.
2. **No information leakage** — Hidden cards must not appear in GraphQL fields visible to other players before turn resolution.
3. **Simultaneous actions** — All active players must submit before the placement algorithm runs.
4. **Async integrity** — Backend uses `async/await` throughout; no blocking I/O on the event loop.
5. **Strict typing** — Python type hints + TypeScript strict mode; avoid `any`.
6. **N+1 avoidance** — Use DataLoaders for relational GraphQL fields where needed.
7. **Dark table-top, vibrant cards** — Dark chrome; color on card faces; honor `prefers-reduced-motion`.

## Repository layout

```
bare-bones/                 # repository folder name on disk may still be 6-nimmt
├── .cursor/                # This documentation
├── backend/
│   ├── app/
│   │   ├── domain/         # Pure game rules
│   │   ├── infrastructure/ # Redis, rooms, timers
│   │   └── graphql/        # Strawberry schema
│   └── tests/
├── frontend/
│   └── src/                # views, components, composables, 3D scene
├── docker-compose.yml
└── README.md               # Portfolio readme (English)
```

## Implementation order

See **[roadmap.md](./roadmap.md)** for the full checklist. Critical path items through M5 are complete; current focus is M6 polish and 3D presentation.
