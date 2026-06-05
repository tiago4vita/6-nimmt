export const PLAYER_PRIVATE_VIEW_FIELDS = `
  fragment PlayerPrivateViewFields on PlayerPrivateView {
    myPlayerId
    myHand {
      id
      value
      bones
    }
    mySubmittedCard {
      id
      value
      bones
    }
    lastResolvedPlays {
      playerId
      card {
        id
        value
        bones
      }
      rowIndex
      bonesTaken
    }
    room {
      id
      code
      phase
      roundNumber
      submitDeadline
      submitTimeoutSeconds
      winnerIds
      finishReason
      forfeitedPlayerIds
      updatedAt
      rows {
        index
        cards {
          id
          value
          bones
        }
      }
      players {
        id
        displayName
        bonesTotal
        cardsInHand
        hasSubmitted
        isConnected
        isHost
      }
      submissionProgress {
        submitted
        required
      }
    }
  }
`

export const ENSURE_GUEST_SESSION = `
  query EnsureGuestSession {
    ensureGuestSession {
      guestId
      sessionToken
      expiresAt
    }
  }
`

export const MY_GAME_VIEW = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  query MyGameView($roomId: ID!) {
    myGameView(roomId: $roomId) {
      ...PlayerPrivateViewFields
    }
  }
`

export const MY_GAME_VIEW_UPDATED = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  subscription MyGameViewUpdated($roomId: ID!) {
    myGameViewUpdated(roomId: $roomId) {
      ...PlayerPrivateViewFields
    }
  }
`

export const CREATE_ROOM = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  mutation CreateRoom($displayName: String!, $maxPlayers: Int) {
    createRoom(displayName: $displayName, maxPlayers: $maxPlayers) {
      success
      errors {
        code
        message
      }
      view {
        ...PlayerPrivateViewFields
      }
    }
  }
`

export const JOIN_ROOM = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  mutation JoinRoom($code: String!, $displayName: String!) {
    joinRoom(code: $code, displayName: $displayName) {
      success
      errors {
        code
        message
      }
      view {
        ...PlayerPrivateViewFields
      }
    }
  }
`

export const LEAVE_ROOM = `
  mutation LeaveRoom($roomId: ID!) {
    leaveRoom(roomId: $roomId) {
      success
      errors {
        code
        message
      }
    }
  }
`

export const RETURN_TO_LOBBY = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  mutation ReturnToLobby($roomId: ID!) {
    returnToLobby(roomId: $roomId) {
      success
      errors {
        code
        message
      }
      view {
        ...PlayerPrivateViewFields
      }
    }
  }
`

export const START_GAME = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  mutation StartGame($roomId: ID!) {
    startGame(roomId: $roomId) {
      success
      errors {
        code
        message
      }
      view {
        ...PlayerPrivateViewFields
      }
    }
  }
`

export const SUBMIT_CARD = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  mutation SubmitCard($roomId: ID!, $cardId: ID!) {
    submitCard(roomId: $roomId, cardId: $cardId) {
      success
      errors {
        code
        message
      }
      view {
        ...PlayerPrivateViewFields
      }
    }
  }
`

export const UPDATE_SUBMIT_TIMEOUT = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  mutation UpdateSubmitTimeout($roomId: ID!, $submitTimeoutSeconds: Int!) {
    updateSubmitTimeout(roomId: $roomId, submitTimeoutSeconds: $submitTimeoutSeconds) {
      success
      errors {
        code
        message
      }
      view {
        ...PlayerPrivateViewFields
      }
    }
  }
`

export const UPDATE_DISPLAY_NAME = `
  ${PLAYER_PRIVATE_VIEW_FIELDS}
  mutation UpdateDisplayName($displayName: String!) {
    updateDisplayName(displayName: $displayName) {
      success
      errors {
        code
        message
      }
      view {
        ...PlayerPrivateViewFields
      }
    }
  }
`
