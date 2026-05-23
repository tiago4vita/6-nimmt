from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import strawberry
from strawberry.fastapi import GraphQLRouter

from app.config import settings


@strawberry.type
class Query:
    @strawberry.field
    def health(self) -> str:
        return "ok"


schema = strawberry.Schema(query=Query)

app = FastAPI(title="6 Nimmt API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(GraphQLRouter(schema), prefix="/graphql")
