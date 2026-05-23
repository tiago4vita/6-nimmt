from __future__ import annotations


class InfrastructureError(Exception):
    """Base class for room/session errors raised by infrastructure services."""

    code: str = "INFRA_ERROR"


class UnauthenticatedError(InfrastructureError):
    code = "UNAUTHENTICATED"


class SessionExpiredError(InfrastructureError):
    code = "SESSION_EXPIRED"


class RoomNotFoundError(InfrastructureError):
    code = "ROOM_NOT_FOUND"


class RoomFullError(InfrastructureError):
    code = "ROOM_FULL"


class RoomCodeCollisionError(InfrastructureError):
    code = "ROOM_CODE_COLLISION"


class InvalidPhaseError(InfrastructureError):
    code = "INVALID_PHASE"


class GameAlreadyStartedError(InfrastructureError):
    code = "GAME_ALREADY_STARTED"


class NotHostError(InfrastructureError):
    code = "NOT_HOST"


class NotSeatedError(InfrastructureError):
    code = "NOT_SEATED"


class AlreadySubmittedError(InfrastructureError):
    code = "ALREADY_SUBMITTED"


class CardNotInHandError(InfrastructureError):
    code = "CARD_NOT_IN_HAND"


class NotEnoughPlayersError(InfrastructureError):
    code = "NOT_ENOUGH_PLAYERS"


class InvalidDisplayNameError(InfrastructureError):
    code = "INVALID_DISPLAY_NAME"
