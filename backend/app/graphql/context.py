from __future__ import annotations

from graphql import GraphQLError
from strawberry.fastapi import BaseContext

from app.infrastructure import sessions
from app.infrastructure.auth import extract_bearer, extract_guest_id
from app.infrastructure.models import GuestContext


class GraphQLContext(BaseContext):
    """Per-request context. Auth is lazy so public queries do not require a session.

    Strawberry populates `request`/`response` for HTTP and `connection_params` for WebSocket
    transports automatically (see strawberry.fastapi.BaseContext + WS handler).
    """

    def __init__(self) -> None:
        super().__init__()
        self._guest_context: GuestContext | None = None
        self._guest_resolved: bool = False

    def _collect_credentials(self) -> tuple[str | None, str | None]:
        """Pull Bearer token + guest id from either HTTP headers or WS connection params."""
        token: str | None = None
        guest_id: str | None = None

        if self.request is not None:
            headers = dict(self.request.headers)
            token = extract_bearer(headers)
            guest_id = extract_guest_id(headers)

        params = self.connection_params or {}
        if not token:
            auth = params.get("authorization") or params.get("Authorization")
            if isinstance(auth, str):
                scheme, _, value = auth.partition(" ")
                if scheme.lower() == "bearer" and value:
                    token = value.strip()
        if not guest_id:
            raw = params.get("guestId") or params.get("guest_id") or params.get("X-Guest-Id")
            if isinstance(raw, str) and raw.strip():
                guest_id = raw.strip()

        return token, guest_id

    async def resolve_guest(self) -> GuestContext | None:
        if self._guest_resolved:
            return self._guest_context

        token, guest_id = self._collect_credentials()
        if not token or not guest_id:
            self._guest_context = None
            self._guest_resolved = True
            return None
        try:
            session = await sessions.validate_and_touch_session(guest_id, token)
            self._guest_context = GuestContext(
                guest_id=session.guest_id, display_name=session.display_name
            )
        except Exception:
            self._guest_context = None
        self._guest_resolved = True
        return self._guest_context

    async def require_guest(self) -> GuestContext:
        guest = await self.resolve_guest()
        if guest is None:
            if self.response is not None:
                self.response.status_code = 401
            raise GraphQLError(
                "Authentication required",
                extensions={"code": "UNAUTHENTICATED"},
            )
        return guest


async def get_http_context() -> GraphQLContext:
    return GraphQLContext()
