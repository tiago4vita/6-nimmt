from __future__ import annotations

import enum

from app.infrastructure.errors import (
    AlreadySubmittedError,
    CardNotInHandError,
    InfrastructureError,
    InvalidDisplayNameError,
    InvalidPhaseError,
    NotEnoughPlayersError,
    NotHostError,
    NotSeatedError,
    RoomCodeCollisionError,
    RoomFullError,
    RoomNotFoundError,
    SessionExpiredError,
    UnauthenticatedError,
)


@enum.unique
class GameErrorCode(enum.Enum):
    UNAUTHENTICATED = "UNAUTHENTICATED"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    ROOM_NOT_FOUND = "ROOM_NOT_FOUND"
    ROOM_FULL = "ROOM_FULL"
    ROOM_CODE_COLLISION = "ROOM_CODE_COLLISION"
    GAME_ALREADY_STARTED = "GAME_ALREADY_STARTED"
    NOT_HOST = "NOT_HOST"
    INVALID_PHASE = "INVALID_PHASE"
    CARD_NOT_IN_HAND = "CARD_NOT_IN_HAND"
    ALREADY_SUBMITTED = "ALREADY_SUBMITTED"
    PLAYER_NOT_IN_ROOM = "PLAYER_NOT_IN_ROOM"
    NOT_ENOUGH_PLAYERS = "NOT_ENOUGH_PLAYERS"
    INVALID_DISPLAY_NAME = "INVALID_DISPLAY_NAME"
    INTERNAL_ERROR = "INTERNAL_ERROR"


_EXCEPTION_TO_CODE: dict[type[InfrastructureError], GameErrorCode] = {
    UnauthenticatedError: GameErrorCode.UNAUTHENTICATED,
    SessionExpiredError: GameErrorCode.SESSION_EXPIRED,
    RoomNotFoundError: GameErrorCode.ROOM_NOT_FOUND,
    RoomFullError: GameErrorCode.ROOM_FULL,
    RoomCodeCollisionError: GameErrorCode.ROOM_CODE_COLLISION,
    InvalidPhaseError: GameErrorCode.INVALID_PHASE,
    NotHostError: GameErrorCode.NOT_HOST,
    NotSeatedError: GameErrorCode.PLAYER_NOT_IN_ROOM,
    AlreadySubmittedError: GameErrorCode.ALREADY_SUBMITTED,
    CardNotInHandError: GameErrorCode.CARD_NOT_IN_HAND,
    NotEnoughPlayersError: GameErrorCode.NOT_ENOUGH_PLAYERS,
    InvalidDisplayNameError: GameErrorCode.INVALID_DISPLAY_NAME,
}


def map_infrastructure_error(error: InfrastructureError) -> GameErrorCode:
    return _EXCEPTION_TO_CODE.get(type(error), GameErrorCode.INTERNAL_ERROR)
