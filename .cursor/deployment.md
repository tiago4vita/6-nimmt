# Deployment — Local Docker Compose

## Scope

Portfolio/local development only. Single `docker-compose.yml` at repository root runs all services. No Kubernetes, cloud IaC, or production hardening.

**Runtime note:** Postgres is started by Compose but **not used by the backend yet** (M2.7). Redis is **required** for backend tests and live game infrastructure. Run uvicorn with **one worker** for MVP (in-process locks/timers — see [state-management.md](./state-management.md#single-worker-limitations-mvp)).

## Services

```mermaid
flowchart LR
    subgraph compose [docker-compose]
        FE[frontend]
        BE[backend]
        PG[(postgres)]
        RD[(redis)]
    end

    Browser --> FE
    Browser --> BE
    FE -.->|VITE_* URLs| BE
    BE --> PG
    BE --> RD
```

| Service | Image / Build | Port (host) | Purpose |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | Persistent match metadata |
| `redis` | `redis:7-alpine` | 6379 | Live game state + pub/sub |
| `backend` | Build `./backend` | 8000 | FastAPI + Strawberry GraphQL |
| `frontend` | Build `./frontend` | 5173 | Vite dev server (default profile) |

## Target `docker-compose.yml`

Implemented at repository root. Matches the reference below.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: nimmt
      POSTGRES_PASSWORD: nimmt
      POSTGRES_DB: nimmt
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nimmt"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://nimmt:nimmt@postgres:5432/nimmt
      REDIS_URL: redis://redis:6379/0
      CORS_ORIGINS: http://localhost:5173
      SESSION_SECRET: dev-only-change-me
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    command: npm run dev -- --host 0.0.0.0
    ports:
      - "5173:5173"
    environment:
      VITE_GRAPHQL_HTTP_URL: http://localhost:8000/graphql
      VITE_GRAPHQL_WS_URL: ws://localhost:8000/graphql
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Notes

- Frontend env uses **localhost** URLs because the browser runs on the host, not inside the container network.
- Backend CORS must allow `http://localhost:5173`.
- GraphQL WebSocket typically shares `/graphql` path on the same FastAPI app (Strawberry + uvicorn).

## Environment Variables

### Backend

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | Declared | `postgresql+asyncpg://nimmt:nimmt@postgres:5432/nimmt` | **Unused until M2.7** — async SQLAlchemy URL |
| `REDIS_URL` | Yes | `redis://redis:6379/0` | Redis connection — **required** for game infrastructure |
| `CORS_ORIGINS` | Yes | `http://localhost:5173` | Comma-separated string (parsed in `app.config`) |
| `SESSION_SECRET` | Declared | random string | **Unused** — reserved for optional JWT signing (Option B in auth.md) |
| `LOG_LEVEL` | No | `info` | Declared in config; not wired to uvicorn logging yet |

### Frontend

| Variable | Required | Example |
|---|---|---|
| `VITE_GRAPHQL_HTTP_URL` | Yes | `http://localhost:8000/graphql` |
| `VITE_GRAPHQL_WS_URL` | Yes | `ws://localhost:8000/graphql` |

## Dockerfiles (Sketch)

### `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Use **pip + venv** with `pyproject.toml` (hatchling build backend). Install editable for local dev:

```bash
cd backend
python -m venv .venv
# Windows
.\.venv\Scripts\pip install -e ".[dev]"
# Unix
.venv/bin/pip install -e ".[dev]"
```

### `frontend/Dockerfile`

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

## Production-Like Profile (Optional)

For portfolio demos without Vite HMR:

```yaml
# docker-compose.prod.yml
frontend:
  build:
    target: production
  ports:
    - "8080:80"
  # nginx serves frontend/dist; still points API URLs to localhost:8000
```

Build step: `npm run build` → copy `dist/` to nginx image.

## Local Dev Without Docker

Supported for faster frontend iteration. Requires Docker Desktop running for Postgres/Redis only.

```bash
# Terminal 1 — infrastructure only
docker compose up postgres redis

# Terminal 2 — backend
cd backend
cp .env.example .env   # first time only; uses localhost URLs
# Windows
.\.venv\Scripts\uvicorn.exe app.main:app --reload
# Unix
.venv/bin/uvicorn app.main:app --reload

# Terminal 3 — frontend
cd frontend
cp .env.example .env   # first time only
npm install            # first time only
npm run dev
```

Open `http://localhost:5173` (frontend) and `http://localhost:8000/graphql` (GraphQL playground / health query).

### Backend tests

Integration tests require Redis. Default test DB: `redis://localhost:6379/15` (override with `TEST_REDIS_URL`).

```bash
docker compose up redis -d
cd backend
python -m pytest
```

Tests skip automatically if Redis is unreachable. No CI pipeline yet — run locally before merging M3+.

**Dev hygiene:** set `asyncio_default_fixture_loop_scope = "function"` in `pyproject.toml` `[tool.pytest.ini_options]` to silence pytest-asyncio deprecation warnings.

## Database Migrations

Run on backend startup (dev only) or manually:

```bash
docker compose exec backend alembic upgrade head
```

Do **not** auto-migrate in production — irrelevant for this project.

## Health Checks

| Endpoint | Expected |
|---|---|
| `GET /health` or GraphQL `query { health }` | `"ok"` |
| Postgres `pg_isready` | Docker healthcheck |
| Redis `PING` | Docker healthcheck |

## Portfolio Demo Checklist

1. `docker compose up --build`
2. Open `http://localhost:5173`
3. Two browser windows → create room → join with code → play full game **(blocked until M3 + M4)**
4. Optional: show match row in Postgres via `psql` **(blocked until M2.7)**

**Available today:** GraphQL `health`, REST `/health`, 67 backend pytest against Redis.

## Cross-References

- Architecture: [architecture-overview.md](./architecture-overview.md)
- Frontend env: [frontend-stack.md](./frontend-stack.md)
- Postgres schema: [database-schema.md](./database-schema.md)
