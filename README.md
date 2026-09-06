# BARE BONES

A browser-based multiplayer card game with a tabletop feel, real-time play, and a minimalist UI. Built as a portfolio piece to showcase a full-stack TypeScript + Python stack with GraphQL subscriptions and a 3D game scene.

Inspired by the classic trick-avoidance game *6 nimmt!* (*Take 6*). **BARE BONES** is an original digital implementation with custom art direction and naming — not an official product of the board-game publisher.

<img width="400" height="225" alt="barebones_demo" src="https://github.com/user-attachments/assets/577c96c6-79b3-45a1-af64-fdaea2f6db7b" />


## Current status

**Portfolio-ready playable demo.** You can run the full game locally (or on LAN): create a room, join with a code, play all rounds, see results, rematch, and return to the lobby — with real-time updates over GraphQL subscriptions. No login required (anonymous guest sessions).


| Area                     | Status      | Notes                                                                                    |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------------- |
| Game rules engine        | Done        | Pure Python domain layer; placement, scoring, and phases fully implemented               |
| Live multiplayer         | Done        | Redis-backed rooms, simultaneous submit, turn timer (3–60s), reconnect-friendly state    |
| GraphQL API              | Done        | Queries, mutations, WebSocket subscriptions; OpenAPI reference for HTTP surface          |
| Frontend (core UX)       | Done        | Home → lobby → table → results; rules drawer, toasts, keyboard shortcuts, loading states |
| 3D table presentation    | In progress | TresJS / Three.js card scene, tier effects, and visual polish (M6)                       |
| Backend tests            | Done        | 80+ pytest cases against real Redis (run locally; no CI yet)                             |
| Docker Compose           | Done        | Postgres + Redis + API + Vite dev server; `.env.local` / `.env.lan` presets              |
| Match history (Postgres) | Not started | Database service runs in Compose; persistence not wired at runtime                       |
| Production hosting / CI  | Not started | Local and LAN demos only; single API worker assumed                                      |


**Known limitations (v1)**

- Optimized for **desktop**; mobile shows a notice but is not the primary target
- API runs as a **single worker** (in-process locks/timers — fine for local demos)
- Some accessibility and sound-effect polish still on the backlog
- OpenAPI YAML may lag slightly behind the GraphQL schema (schema in code is authoritative)

Deeper milestone tracking lives in `[.cursor/roadmap.md](.cursor/roadmap.md)` (contributor-oriented).

## How to play

- **2–10 players** join a room with a short code (no account required).
- Each round, everyone **secretly picks one card** from their hand; when all players have submitted, cards are revealed and placed on **four ascending rows**.
- Place your card on the row whose last card is the **closest lower value** than your card.
- If a row already has **five cards**, you **take** that row (penalty) and your card starts a fresh row.
- If your card is **lower than every row tail**, you take a row (lowest bone total in v1) and your card starts that row.
- Cards carry **bones** (penalty points). **Lowest total bones wins.**

Full rules, phases, and edge cases: `[.cursor/game-logic.md](.cursor/game-logic.md)`.

## Tech stack


| Layer     | Technologies                                                   |
| --------- | -------------------------------------------------------------- |
| Frontend  | Vue 3, TypeScript, Vite, URQL, Tailwind CSS, TresJS / Three.js |
| Backend   | FastAPI, Strawberry GraphQL, Redis, SQLModel (Postgres ready)  |
| Realtime  | GraphQL subscriptions over WebSocket, Redis pub/sub            |
| Local dev | Docker Compose (Postgres, Redis, API, Vite)                    |


## Quick start (Docker)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/), Git.

```bash
docker compose --env-file .env.local up --build
```

Open **[http://localhost:5173](http://localhost:5173)**, enter a display name, create a room or join with a code. For a two-player test, use two browser windows (or one normal + one private window).

### Play on the same Wi‑Fi (LAN)

1. Copy `.env.lan` and set `LAN_HOST` to your machine’s IPv4 address.
2. Run: `docker compose --env-file .env.lan up --build`
3. Everyone opens `http://<your-lan-ip>:5173` (not `localhost` on other devices).
4. Allow TCP **5173** and **8000** through the host firewall if needed.

Details: `[.cursor/deployment.md](.cursor/deployment.md)`.

## Local development (without full Docker for apps)

**Prerequisites:** Node 22+, Python 3.12+, Docker (for Postgres + Redis only).

```bash
# Infrastructure
docker compose up postgres redis -d

# Backend (first time)
cd backend
python -m venv .venv
# Windows:  .\.venv\Scripts\pip install -e ".[dev]"
# macOS/Linux:  .venv/bin/pip install -e ".[dev]"
cp .env.example .env
# Windows:  .\.venv\Scripts\uvicorn.exe app.main:app --reload
# macOS/Linux:  .venv/bin/uvicorn app.main:app --reload

# Frontend (first time)
cd frontend
npm install
cp .env.example .env
npm run dev
```

- App: **[http://localhost:5173](http://localhost:5173)**
- GraphQL: **[http://localhost:8000/graphql](http://localhost:8000/graphql)**
- API docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

### Backend tests

Redis must be running (default test DB: `redis://localhost:6379/15`):

```bash
cd backend
python -m pytest
```

## Project structure

```
├── frontend/          # Vue SPA — lobby, game table, 3D cards
├── backend/           # FastAPI + GraphQL + domain rules engine
├── docker-compose.yml
├── .cursor/           # Architecture & game design docs (English)
└── README.md          # This file
```

## Documentation


| Document                                                               | Contents                                 |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| `[.cursor/README.md](.cursor/README.md)`                               | Overview for contributors and AI context |
| `[.cursor/game-logic.md](.cursor/game-logic.md)`                       | Rules, scoring, phases                   |
| `[.cursor/deployment.md](.cursor/deployment.md)`                       | Compose, env vars, LAN                   |
| `[.cursor/architecture-overview.md](.cursor/architecture-overview.md)` | System design                            |


## License

Copyright © Tiago Vita. Open-source, non-commercial fan implementation. Use and modify for learning and portfolio demos; do not imply affiliation with the original *6 nimmt!* trademark or publisher.
