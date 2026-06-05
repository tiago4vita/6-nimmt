from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.domain.game import GamePhase
from app.domain.game import GameFinishReason
from app.showcase import SHOWCASE_MAX_PLAYERS


class CardDTO(BaseModel):
    id: str
    value: int


class RowDTO(BaseModel):
    cards: list[CardDTO] = Field(default_factory=list)


class ResolvedPlayDTO(BaseModel):
    player_id: str
    card: CardDTO
    row_index: int
    collected_row: bool
    bones_collected: int


class PlayerInRoom(BaseModel):
    id: str
    guest_id: str
    display_name: str
    bones_total: int = 0
    hand: list[CardDTO] = Field(default_factory=list)
    is_connected: bool = True
    submission: str | None = None
    consecutive_auto_submit_rounds: int = 0


class GameRoomState(BaseModel):
    id: str
    code: str
    phase: GamePhase = GamePhase.LOBBY
    round_number: int = 0
    max_players: int = SHOWCASE_MAX_PLAYERS
    host_player_id: str
    version: int = 0
    created_at: datetime
    updated_at: datetime
    submit_deadline: datetime | None = None
    submit_timeout_seconds: int = Field(default=30, ge=3, le=60)
    players: list[PlayerInRoom] = Field(default_factory=list)
    rows: list[RowDTO] = Field(default_factory=list)
    deck: list[CardDTO] = Field(default_factory=list)
    last_resolution: list[ResolvedPlayDTO] | None = None
    winner_ids: list[str] | None = None
    finish_reason: GameFinishReason | None = None
    forfeited_player_ids: list[str] | None = None

    def player_by_guest_id(self, guest_id: str) -> PlayerInRoom | None:
        for player in self.players:
            if player.guest_id == guest_id:
                return player
        return None

    def player_by_id(self, player_id: str) -> PlayerInRoom | None:
        for player in self.players:
            if player.id == player_id:
                return player
        return None


class GuestSession(BaseModel):
    guest_id: str
    token_hash: str
    created_at: datetime
    expires_at: datetime
    last_seen_at: datetime
    display_name: str | None = None


class GuestContext(BaseModel):
    guest_id: str
    display_name: str | None = None


class GuestSessionResult(BaseModel):
    guest_id: str
    session_token: str
    expires_at: datetime
