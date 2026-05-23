import asyncio

from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_health_and_openapi_endpoints() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        health = await client.get("/health")
        assert health.status_code == 200
        assert health.json() == {"status": "ok"}

        openapi_yaml = await client.get("/openapi.yaml")
        assert openapi_yaml.status_code == 200
        assert "6 Nimmt API" in openapi_yaml.text

        openapi_json = await client.get("/openapi.json")
        assert openapi_json.status_code == 200
        payload = openapi_json.json()
        assert payload["info"]["title"] == "6 Nimmt API"
        assert "/graphql" in payload["paths"]
        assert "ensureGuestSession" in payload["x-graphql-operations"]["queries"]

        graphql = await client.post("/graphql", json={"query": "{ health }"})
        assert graphql.status_code == 200
        assert graphql.json()["data"]["health"] == "ok"


def test_health_and_openapi_endpoints_sync() -> None:
    asyncio.run(test_health_and_openapi_endpoints())
