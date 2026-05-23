from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from redis.asyncio import Redis

from app.infrastructure import auth, redis as redis_keys, sessions
from app.infrastructure.errors import SessionExpiredError, UnauthenticatedError


pytestmark = pytest.mark.asyncio


async def test_ensure_session_mints_new_credentials(redis_client: Redis) -> None:
    result = await sessions.ensure_guest_session()

    assert result.guest_id
    assert result.session_token
    assert result.expires_at > datetime.now(UTC)

    stored = await sessions.get_session(result.guest_id)
    assert stored is not None
    assert stored.token_hash != result.session_token


async def test_ensure_session_returns_existing_when_valid(redis_client: Redis) -> None:
    first = await sessions.ensure_guest_session()

    second = await sessions.ensure_guest_session(
        existing_guest_id=first.guest_id,
        existing_token=first.session_token,
    )

    assert second.guest_id == first.guest_id
    assert second.session_token == first.session_token


async def test_ensure_session_mints_new_when_token_mismatch(redis_client: Redis) -> None:
    first = await sessions.ensure_guest_session()

    second = await sessions.ensure_guest_session(
        existing_guest_id=first.guest_id,
        existing_token="not-the-real-token",
    )

    assert second.guest_id != first.guest_id


async def test_validate_token_rejects_unknown_guest(redis_client: Redis) -> None:
    with pytest.raises(UnauthenticatedError):
        await sessions.validate_token("missing-guest", "any-token")


async def test_validate_token_rejects_expired_session(redis_client: Redis) -> None:
    session, token = await sessions.create_session()

    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await redis_keys.set_json(
        redis_keys.guest_session_key(session.guest_id),
        session.model_dump(mode="json"),
        ttl_seconds=60,
    )

    with pytest.raises(SessionExpiredError):
        await sessions.validate_token(session.guest_id, token)


async def test_touch_session_extends_expiry(redis_client: Redis) -> None:
    session, _ = await sessions.create_session()
    original_expiry = session.expires_at

    session.expires_at = datetime.now(UTC) + timedelta(days=1)
    await redis_keys.set_json(
        redis_keys.guest_session_key(session.guest_id),
        session.model_dump(mode="json"),
        ttl_seconds=60,
    )

    refreshed = await sessions.touch_session(session.guest_id)

    assert refreshed is not None
    assert refreshed.expires_at > original_expiry


async def test_get_current_guest_validates_headers(redis_client: Redis) -> None:
    result = await sessions.ensure_guest_session()

    context = await auth.get_current_guest(
        {
            "Authorization": f"Bearer {result.session_token}",
            "X-Guest-Id": result.guest_id,
        }
    )

    assert context.guest_id == result.guest_id


async def test_get_current_guest_rejects_missing_headers(redis_client: Redis) -> None:
    with pytest.raises(UnauthenticatedError):
        await auth.get_current_guest({})


async def test_get_current_guest_rejects_bad_scheme(redis_client: Redis) -> None:
    result = await sessions.ensure_guest_session()
    with pytest.raises(UnauthenticatedError):
        await auth.get_current_guest(
            {
                "Authorization": f"Basic {result.session_token}",
                "X-Guest-Id": result.guest_id,
            }
        )
