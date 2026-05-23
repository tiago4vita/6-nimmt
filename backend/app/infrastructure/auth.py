from __future__ import annotations

from collections.abc import Mapping

from redis.asyncio import Redis

from app.infrastructure import sessions
from app.infrastructure.errors import UnauthenticatedError
from app.infrastructure.models import GuestContext


def extract_bearer(headers: Mapping[str, str]) -> str | None:
    """Pull the bearer token from the Authorization header (case-insensitive)."""
    for key, value in headers.items():
        if key.lower() == "authorization":
            scheme, _, token = value.partition(" ")
            if scheme.lower() == "bearer" and token:
                return token.strip()
            return None
    return None


def extract_guest_id(headers: Mapping[str, str]) -> str | None:
    for key, value in headers.items():
        if key.lower() == "x-guest-id":
            return value.strip() or None
    return None


async def get_current_guest(
    headers: Mapping[str, str],
    *,
    client: Redis | None = None,
) -> GuestContext:
    token = extract_bearer(headers)
    guest_id = extract_guest_id(headers)
    if not token or not guest_id:
        raise UnauthenticatedError("Missing bearer token or X-Guest-Id header")

    session = await sessions.validate_token(guest_id, token, client=client)
    await sessions.touch_session(guest_id, client=client)
    return GuestContext(guest_id=session.guest_id, display_name=session.display_name)
