from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import httpx
import pytest
import pytest_asyncio
import strawberry
from redis.asyncio import Redis
from strawberry.types import Info

from app.config import settings
from app.graphql.context import GraphQLContext
from app.graphql.subscriptions import Subscription
from app.infrastructure import pubsub
from app.main import app

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def pubsub_listener(redis_client: Redis) -> AsyncIterator[None]:
    pubsub.registry.clear()
    await pubsub.listener.start()
    try:
        yield
    finally:
        await pubsub.listener.stop()
        pubsub.registry.clear()


@pytest.fixture
def client(redis_client: Redis) -> httpx.AsyncClient:  # type: ignore[misc]
    transport = httpx.ASGITransport(app=app)
    settings.submit_timeout_seconds = 600
    return httpx.AsyncClient(transport=transport, base_url="http://testserver")


async def _gql(
    client: httpx.AsyncClient,
    query: str,
    *,
    variables: dict[str, Any] | None = None,
    token: str | None = None,
    guest_id: str | None = None,
) -> dict[str, Any]:
    headers: dict[str, str] = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if guest_id:
        headers["X-Guest-Id"] = guest_id
    response = await client.post(
        "/graphql",
        json={"query": query, "variables": variables or {}},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    return response.json()


async def _ensure_guest(
    client: httpx.AsyncClient,
) -> tuple[str, str]:
    payload = await _gql(
        client,
        "query { ensureGuestSession { guestId sessionToken expiresAt } }",
    )
    data = payload["data"]["ensureGuestSession"]
    return data["guestId"], data["sessionToken"]


async def _create_room(
    client: httpx.AsyncClient, token: str, guest_id: str, name: str = "Host"
) -> dict[str, Any]:
    payload = await _gql(
        client,
        """
        mutation CreateRoom($name: String!) {
          createRoom(displayName: $name) {
            success
            errors { code message }
            view {
              myPlayerId
              myHand { id value bones }
              room { id code phase players { id displayName isHost } }
            }
          }
        }
        """,
        variables={"name": name},
        token=token,
        guest_id=guest_id,
    )
    return payload["data"]["createRoom"]


async def _join_room(
    client: httpx.AsyncClient, token: str, guest_id: str, code: str, name: str
) -> dict[str, Any]:
    payload = await _gql(
        client,
        """
        mutation JoinRoom($code: String!, $name: String!) {
          joinRoom(code: $code, displayName: $name) {
            success
            errors { code message }
            view {
              myPlayerId
              myHand { id value }
              room { id code phase players { id displayName } }
            }
          }
        }
        """,
        variables={"code": code, "name": name},
        token=token,
        guest_id=guest_id,
    )
    return payload["data"]["joinRoom"]


async def _start_game(
    client: httpx.AsyncClient, token: str, guest_id: str, room_id: str
) -> dict[str, Any]:
    payload = await _gql(
        client,
        """
        mutation StartGame($roomId: ID!) {
          startGame(roomId: $roomId) {
            success
            errors { code message }
            view {
              myHand { id value }
              room {
                phase
                roundNumber
                rows { index cards { id value } }
                submissionProgress { submitted required }
                submitDeadline
              }
            }
          }
        }
        """,
        variables={"roomId": room_id},
        token=token,
        guest_id=guest_id,
    )
    return payload["data"]["startGame"]


async def _submit_card(
    client: httpx.AsyncClient,
    token: str,
    guest_id: str,
    room_id: str,
    card_id: str,
) -> dict[str, Any]:
    payload = await _gql(
        client,
        """
        mutation SubmitCard($roomId: ID!, $cardId: ID!) {
          submitCard(roomId: $roomId, cardId: $cardId) {
            success
            errors { code message }
            view {
              myHand { id value }
              mySubmittedCard { id value }
              lastResolvedPlays { playerId card { id value } rowIndex bonesTaken }
              room { phase roundNumber winnerIds players { id hasSubmitted bonesTotal } }
            }
          }
        }
        """,
        variables={"roomId": room_id, "cardId": card_id},
        token=token,
        guest_id=guest_id,
    )
    return payload["data"]["submitCard"]


async def test_health_query(client: httpx.AsyncClient) -> None:
    async with client:
        data = await _gql(client, "query { health }")
    assert data["data"]["health"] == "ok"


async def test_ensure_guest_session_mints_and_reuses(client: httpx.AsyncClient) -> None:
    async with client:
        first_id, first_token = await _ensure_guest(client)
        second = await _gql(
            client,
            "query { ensureGuestSession { guestId sessionToken } }",
            token=first_token,
            guest_id=first_id,
        )
    second_data = second["data"]["ensureGuestSession"]
    assert second_data["guestId"] == first_id
    assert second_data["sessionToken"] == first_token


async def test_mutation_requires_authentication(client: httpx.AsyncClient) -> None:
    async with client:
        response = await client.post(
            "/graphql",
            json={"query": 'mutation { createRoom(displayName: "Anon") { success errors { code } } }'},
        )
    assert response.status_code == 401, response.text
    payload = response.json()
    assert payload.get("errors")
    extensions = payload["errors"][0].get("extensions") or {}
    assert extensions.get("code") == "UNAUTHENTICATED"


async def test_create_room_returns_private_view(client: httpx.AsyncClient) -> None:
    async with client:
        guest_id, token = await _ensure_guest(client)
        result = await _create_room(client, token, guest_id, name="Alice")

    assert result["success"] is True
    assert result["errors"] == []
    view = result["view"]
    assert view is not None
    assert view["room"]["phase"] == "LOBBY"
    assert view["room"]["players"][0]["isHost"] is True
    assert view["myHand"] == []


async def test_join_room_with_invalid_code_returns_error(
    client: httpx.AsyncClient,
) -> None:
    async with client:
        guest_id, token = await _ensure_guest(client)
        result = await _join_room(client, token, guest_id, "ZZZZZZ", "Bob")

    assert result["success"] is False
    assert result["view"] is None
    assert result["errors"][0]["code"] == "ROOM_NOT_FOUND"


async def test_full_two_player_game_via_graphql(client: httpx.AsyncClient) -> None:
    async with client:
        host_id, host_token = await _ensure_guest(client)
        guest_id, guest_token = await _ensure_guest(client)

        host_create = await _create_room(client, host_token, host_id, name="Alice")
        room = host_create["view"]["room"]
        room_id = room["id"]
        code = room["code"]

        join_result = await _join_room(client, guest_token, guest_id, code, "Bob")
        assert join_result["success"] is True

        start_result = await _start_game(client, host_token, host_id, room_id)
        assert start_result["success"] is True
        assert start_result["view"]["room"]["phase"] == "SUBMIT"
        assert len(start_result["view"]["myHand"]) == 10

        final_phase: str | None = None
        for _ in range(15):
            view_host = await _gql(
                client,
                "query($r: ID!) { myGameView(roomId: $r) { myHand { id } room { phase } } }",
                variables={"r": room_id},
                token=host_token,
                guest_id=host_id,
            )
            host_state = view_host["data"]["myGameView"]
            if host_state is None or host_state["room"]["phase"] == "FINISHED":
                final_phase = "FINISHED"
                break

            host_card = host_state["myHand"][0]["id"]
            await _submit_card(client, host_token, host_id, room_id, host_card)

            view_guest = await _gql(
                client,
                "query($r: ID!) { myGameView(roomId: $r) { myHand { id } room { phase } } }",
                variables={"r": room_id},
                token=guest_token,
                guest_id=guest_id,
            )
            guest_state = view_guest["data"]["myGameView"]
            if guest_state is None or guest_state["room"]["phase"] == "FINISHED":
                final_phase = "FINISHED"
                break
            guest_card = guest_state["myHand"][0]["id"]
            submit_result = await _submit_card(
                client, guest_token, guest_id, room_id, guest_card
            )
            phase = submit_result["view"]["room"]["phase"]
            if phase == "FINISHED":
                final_phase = "FINISHED"
                break

        assert final_phase == "FINISHED"


async def test_no_hand_leakage_in_public_room(client: httpx.AsyncClient) -> None:
    async with client:
        host_id, host_token = await _ensure_guest(client)
        guest_id, guest_token = await _ensure_guest(client)

        host_create = await _create_room(client, host_token, host_id, name="Alice")
        code = host_create["view"]["room"]["code"]
        room_id = host_create["view"]["room"]["id"]

        await _join_room(client, guest_token, guest_id, code, "Bob")
        await _start_game(client, host_token, host_id, room_id)

        public_payload = await _gql(
            client,
            """
            query($code: String!) {
              roomByCode(code: $code) {
                id code phase players { id displayName cardsInHand hasSubmitted }
                rows { cards { id value } }
              }
            }
            """,
            variables={"code": code},
            token=guest_token,
            guest_id=guest_id,
        )
        room_text = public_payload["data"]["roomByCode"]

        assert room_text is not None
        for player in room_text["players"]:
            assert "hand" not in player
            assert "myHand" not in player
            assert "submission" not in player
            assert "mySubmittedCard" not in player
        assert all(player["cardsInHand"] == 10 for player in room_text["players"])

        host_view = await _gql(
            client,
            """
            query($r: ID!) {
              myGameView(roomId: $r) {
                myHand { id value }
                mySubmittedCard { id }
                room {
                  players { id cardsInHand hasSubmitted }
                  rows { cards { id value } }
                }
              }
            }
            """,
            variables={"r": room_id},
            token=host_token,
            guest_id=host_id,
        )
        view = host_view["data"]["myGameView"]
        host_hand_ids = {card["id"] for card in view["myHand"]}
        assert view["mySubmittedCard"] is None
        assert len(host_hand_ids) == 10

        first_card = view["myHand"][0]["id"]
        submit_result = await _submit_card(
            client, host_token, host_id, room_id, first_card
        )
        assert submit_result["success"] is True

        guest_view = await _gql(
            client,
            """
            query($r: ID!) {
              myGameView(roomId: $r) {
                myHand { id value }
                mySubmittedCard { id }
                room { players { id cardsInHand hasSubmitted } }
              }
            }
            """,
            variables={"r": room_id},
            token=guest_token,
            guest_id=guest_id,
        )
        guest_data = guest_view["data"]["myGameView"]
        assert guest_data["mySubmittedCard"] is None

        guest_hand_ids = {card["id"] for card in guest_data["myHand"]}
        assert host_hand_ids.isdisjoint(guest_hand_ids), "Hands must not overlap"

        host_player_id_in_guest_view = None
        for player in guest_data["room"]["players"]:
            if player["hasSubmitted"]:
                host_player_id_in_guest_view = player["id"]
        assert host_player_id_in_guest_view is not None
        assert "mySubmittedCard" not in guest_data["room"]


async def test_submit_deadline_exposed_during_submit_phase(
    client: httpx.AsyncClient,
) -> None:
    async with client:
        host_id, host_token = await _ensure_guest(client)
        guest_id, guest_token = await _ensure_guest(client)

        host_create = await _create_room(client, host_token, host_id, name="Alice")
        room_id = host_create["view"]["room"]["id"]
        code = host_create["view"]["room"]["code"]

        await _join_room(client, guest_token, guest_id, code, "Bob")

        lobby_view = await _gql(
            client,
            "query($r: ID!) { myGameView(roomId: $r) { room { phase submitDeadline } } }",
            variables={"r": room_id},
            token=host_token,
            guest_id=host_id,
        )
        assert lobby_view["data"]["myGameView"]["room"]["phase"] == "LOBBY"
        assert lobby_view["data"]["myGameView"]["room"]["submitDeadline"] is None

        start_result = await _start_game(client, host_token, host_id, room_id)
        assert start_result["success"] is True
        assert start_result["view"]["room"]["phase"] == "SUBMIT"
        assert start_result["view"]["room"]["submitDeadline"] is not None

        host_card = start_result["view"]["myHand"][0]["id"]
        guest_card = (
            await _gql(
                client,
                "query($r: ID!) { myGameView(roomId: $r) { myHand { id } } }",
                variables={"r": room_id},
                token=guest_token,
                guest_id=guest_id,
            )
        )["data"]["myGameView"]["myHand"][0]["id"]

        await _submit_card(client, host_token, host_id, room_id, host_card)
        resolve_result = await _submit_card(
            client, guest_token, guest_id, room_id, guest_card
        )
        next_room = resolve_result["view"]["room"]
        if next_room["phase"] == "SUBMIT":
            after_view = await _gql(
                client,
                "query($r: ID!) { myGameView(roomId: $r) { room { phase submitDeadline } } }",
                variables={"r": room_id},
                token=host_token,
                guest_id=host_id,
            )
            after_room = after_view["data"]["myGameView"]["room"]
            assert after_room["submitDeadline"] is not None


async def test_update_display_name_succeeds(client: httpx.AsyncClient) -> None:
    async with client:
        guest_id, token = await _ensure_guest(client)
        await _create_room(client, token, guest_id, name="OldName")
        result = await _gql(
            client,
            """
            mutation {
              updateDisplayName(displayName: "NewName") {
                success
                errors { code }
                view {
                  myPlayerId
                  room { players { id displayName } }
                }
              }
            }
            """,
            token=token,
            guest_id=guest_id,
        )
    payload = result["data"]["updateDisplayName"]
    assert payload["success"] is True
    assert payload["errors"] == []
    view = payload["view"]
    assert view is not None
    host = next(
        player
        for player in view["room"]["players"]
        if player["id"] == view["myPlayerId"]
    )
    assert host["displayName"] == "NewName"


async def test_join_started_room_returns_game_already_started(
    client: httpx.AsyncClient,
) -> None:
    async with client:
        host_id, host_token = await _ensure_guest(client)
        guest_id, guest_token = await _ensure_guest(client)

        host_create = await _create_room(client, host_token, host_id, name="Alice")
        code = host_create["view"]["room"]["code"]
        room_id = host_create["view"]["room"]["id"]

        await _join_room(client, guest_token, guest_id, code, "Bob")
        await _start_game(client, host_token, host_id, room_id)

        late_id, late_token = await _ensure_guest(client)
        result = await _join_room(client, late_token, late_id, code, "Charlie")

    assert result["success"] is False
    assert result["errors"][0]["code"] == "GAME_ALREADY_STARTED"


@dataclass
class _MockInfo:
    context: GraphQLContext


def _subscription_context(token: str, guest_id: str) -> _MockInfo:
    ctx = GraphQLContext()
    ctx.connection_params = {
        "authorization": f"Bearer {token}",
        "guestId": guest_id,
    }
    return _MockInfo(context=ctx)


async def _collect_subscription_events(
    info: Info[GraphQLContext, None],
    room_id: str,
    *,
    field: str,
    count: int,
) -> list[Any]:
    subscription = Subscription()
    if field == "my_game_view_updated":
        stream = subscription.my_game_view_updated(info, strawberry.ID(room_id))
    else:
        stream = subscription.game_room_updated(info, strawberry.ID(room_id))

    events: list[Any] = []
    async for payload in stream:
        events.append(payload)
        if len(events) >= count:
            break
    return events


async def test_subscription_my_game_view_updated_on_resolve(
    client: httpx.AsyncClient,
    pubsub_listener: None,
) -> None:
    async with client:
        host_id, host_token = await _ensure_guest(client)
        guest_id, guest_token = await _ensure_guest(client)

        host_create = await _create_room(client, host_token, host_id, name="Alice")
        room_id = host_create["view"]["room"]["id"]
        code = host_create["view"]["room"]["code"]

        await _join_room(client, guest_token, guest_id, code, "Bob")
        start_result = await _start_game(client, host_token, host_id, room_id)
        assert start_result["success"] is True

        host_card = start_result["view"]["myHand"][0]["id"]
        guest_card = (
            await _gql(
                client,
                "query($r: ID!) { myGameView(roomId: $r) { myHand { id } } }",
                variables={"r": room_id},
                token=guest_token,
                guest_id=guest_id,
            )
        )["data"]["myGameView"]["myHand"][0]["id"]

        info = _subscription_context(host_token, host_id)
        stream = Subscription().my_game_view_updated(info, strawberry.ID(room_id))
        initial = await stream.__anext__()
        assert initial.room.phase.value == "SUBMIT"
        assert len(initial.my_hand) == 10
        assert initial.my_submitted_card is None

        await _submit_card(client, host_token, host_id, room_id, host_card)
        after_host = await stream.__anext__()
        assert after_host.my_submitted_card is not None
        assert after_host.room.submission_progress.submitted == 1

        resolve_result = await _submit_card(
            client, guest_token, guest_id, room_id, guest_card
        )
        after_resolve = await stream.__anext__()

    assert resolve_result["success"] is True
    assert len(resolve_result["view"]["lastResolvedPlays"]) == 2
    assert len(after_resolve.last_resolved_plays) == 2
    assert after_resolve.room.phase.value in {"SUBMIT", "FINISHED"}


async def test_game_room_updated_public_subscription(
    client: httpx.AsyncClient,
    pubsub_listener: None,
) -> None:
    async with client:
        host_id, host_token = await _ensure_guest(client)
        guest_id, guest_token = await _ensure_guest(client)

        host_create = await _create_room(client, host_token, host_id, name="Alice")
        room_id = host_create["view"]["room"]["id"]
        code = host_create["view"]["room"]["code"]
        await _join_room(client, guest_token, guest_id, code, "Bob")

        info = _subscription_context(host_token, host_id)
        events = await _collect_subscription_events(
            info, room_id, field="game_room_updated", count=1
        )

    public_room = events[0]
    assert public_room.phase.value == "LOBBY"
    assert len(public_room.players) == 2
    for player in public_room.players:
        assert player.cards_in_hand == 0
