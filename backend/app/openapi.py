from __future__ import annotations

from pathlib import Path

import yaml
from fastapi.openapi.utils import get_openapi

OPENAPI_PATH = Path(__file__).resolve().parent.parent / "openapi.yaml"


def load_openapi_spec() -> dict:
    """Load the canonical OpenAPI document from disk."""
    with OPENAPI_PATH.open(encoding="utf-8") as spec_file:
        return yaml.safe_load(spec_file)


def build_app_openapi(app) -> dict:
    """Merge the static spec with live FastAPI route metadata."""
    spec = load_openapi_spec()

    generated = get_openapi(
        title=spec["info"]["title"],
        version=spec["info"]["version"],
        description=spec["info"].get("description", ""),
        routes=app.routes,
    )

    for key in ("paths", "components", "tags", "servers", "x-websocket", "x-graphql-operations", "x-mutation-semantics", "x-game-rules"):
        if key in spec:
            generated[key] = spec[key]

    generated["info"] = spec["info"]
    generated["openapi"] = spec.get("openapi", generated.get("openapi", "3.1.0"))

    return generated
