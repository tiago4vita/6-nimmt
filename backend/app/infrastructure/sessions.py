from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from redis.asyncio import Redis

from app.config import settings
from app.infrastructure import redis as redis_keys
from app.infrastructure.errors import SessionExpiredError, UnauthenticatedError
from app.infrastructure.models import GuestSession, GuestSessionResult


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> datetime:
    return datetime.now(UTC)


def _ttl_seconds() -> int:
    return settings.session_ttl_days * 24 * 60 * 60


async def _save_session(session: GuestSession, *, client: Redis | None = None) -> None:
    await redis_keys.set_json(
        redis_keys.guest_session_key(session.guest_id),
        session.model_dump(mode="json"),
        ttl_seconds=_ttl_seconds(),
        client=client,
    )


async def get_session(guest_id: str, *, client: Redis | None = None) -> GuestSession | None:
    payload = await redis_keys.get_json(redis_keys.guest_session_key(guest_id), client=client)
    if payload is None:
        return None
    return GuestSession.model_validate(payload)


async def create_session(
    *,
    display_name: str | None = None,
    client: Redis | None = None,
) -> tuple[GuestSession, str]:
    guest_id = str(uuid4())
    token = secrets.token_urlsafe(32)
    now = _now()
    session = GuestSession(
        guest_id=guest_id,
        token_hash=_hash_token(token),
        created_at=now,
        expires_at=now + timedelta(days=settings.session_ttl_days),
        last_seen_at=now,
        display_name=display_name,
    )
    await _save_session(session, client=client)
    return session, token


async def touch_session(guest_id: str, *, client: Redis | None = None) -> GuestSession | None:
    session = await get_session(guest_id, client=client)
    if session is None:
        return None
    now = _now()
    session.last_seen_at = now
    session.expires_at = now + timedelta(days=settings.session_ttl_days)
    await _save_session(session, client=client)
    return session


async def update_display_name(
    guest_id: str, display_name: str, *, client: Redis | None = None
) -> GuestSession | None:
    session = await get_session(guest_id, client=client)
    if session is None:
        return None
    session.display_name = display_name
    await _save_session(session, client=client)
    return session


async def validate_token(
    guest_id: str,
    token: str,
    *,
    client: Redis | None = None,
) -> GuestSession:
    session = await get_session(guest_id, client=client)
    if session is None:
        raise UnauthenticatedError("Unknown guest")
    if session.token_hash != _hash_token(token):
        raise UnauthenticatedError("Invalid session token")
    if session.expires_at < _now():
        raise SessionExpiredError("Session expired")
    return session


async def validate_and_touch_session(
    guest_id: str,
    token: str,
    *,
    client: Redis | None = None,
) -> GuestSession:
    """Validate credentials and refresh TTL in one read + one write."""
    session = await validate_token(guest_id, token, client=client)
    now = _now()
    session.last_seen_at = now
    session.expires_at = now + timedelta(days=settings.session_ttl_days)
    await _save_session(session, client=client)
    return session


async def ensure_guest_session(
    *,
    existing_guest_id: str | None = None,
    existing_token: str | None = None,
    client: Redis | None = None,
) -> GuestSessionResult:
    """Return a valid session, reusing the supplied one if still good."""
    if existing_guest_id and existing_token:
        session = await get_session(existing_guest_id, client=client)
        if (
            session is not None
            and session.token_hash == _hash_token(existing_token)
            and session.expires_at >= _now()
        ):
            now = _now()
            session.last_seen_at = now
            session.expires_at = now + timedelta(days=settings.session_ttl_days)
            await _save_session(session, client=client)
            return GuestSessionResult(
                guest_id=session.guest_id,
                session_token=existing_token,
                expires_at=session.expires_at,
            )

    session, token = await create_session(client=client)
    return GuestSessionResult(
        guest_id=session.guest_id,
        session_token=token,
        expires_at=session.expires_at,
    )
