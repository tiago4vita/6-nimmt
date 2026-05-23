from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from strawberry.fastapi import GraphQLRouter

from app.config import settings
from app.graphql.context import get_http_context
from app.graphql.schema import schema
from app.infrastructure import pubsub
from app.infrastructure import redis as redis_module
from app.infrastructure import timers
from app.openapi import OPENAPI_PATH, build_app_openapi


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await redis_module.connect()
    await pubsub.listener.start()
    try:
        yield
    finally:
        await pubsub.listener.stop()
        await timers.shutdown()
        await redis_module.close()


app = FastAPI(
    title="6 Nimmt API",
    version="0.1.0",
    description=(
        "FastAPI + Strawberry GraphQL backend for the 6 nimmt! card game. "
        "See `/openapi.yaml` or `/docs` for the full API reference."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


@app.get(
    "/health",
    tags=["Health"],
    summary="REST health check",
    response_model=dict[str, str],
)
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.get("/openapi.yaml", include_in_schema=False)
async def openapi_yaml() -> Response:
    return Response(
        content=OPENAPI_PATH.read_text(encoding="utf-8"),
        media_type="application/yaml",
    )


def custom_openapi() -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    app.openapi_schema = build_app_openapi(app)
    return app.openapi_schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

graphql_app = GraphQLRouter(
    schema,
    context_getter=get_http_context,
    subscription_protocols=("graphql-transport-ws", "graphql-ws"),
)

app.include_router(graphql_app, prefix="/graphql")
