export type GamePhase = 'LOBBY' | 'DEAL' | 'SUBMIT' | 'RESOLVE' | 'SCORE' | 'FINISHED'

export type GameErrorCode =
  | 'UNAUTHENTICATED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'NOT_HOST'
  | 'INVALID_PHASE'
  | 'CARD_NOT_IN_HAND'
  | 'ALREADY_SUBMITTED'
  | 'PLAYER_NOT_IN_ROOM'
  | 'SESSION_EXPIRED'

export interface Card {
  id: string
  value: number
  bones: number
}

export interface Row {
  index: number
  cards: Card[]
}

export interface PlayerPublic {
  id: string
  displayName: string
  bonesTotal: number
  cardsInHand: number
  hasSubmitted: boolean
  isConnected: boolean
  isHost: boolean
}

export interface SubmissionProgress {
  submitted: number
  required: number
}

export interface GameRoomPublic {
  id: string
  code: string
  phase: GamePhase
  roundNumber: number
  rows: Row[]
  players: PlayerPublic[]
  submissionProgress: SubmissionProgress
  winnerIds: string[] | null
  updatedAt: string
}

export interface ResolvedPlay {
  playerId: string
  card: Card
  rowIndex: number | null
  bonesTaken: number
}

export interface PlayerPrivateView {
  room: GameRoomPublic
  myPlayerId: string
  myHand: Card[]
  mySubmittedCard: Card | null
  lastResolvedPlays: ResolvedPlay[]
}

export interface GuestSession {
  guestId: string
  sessionToken: string
  expiresAt: string
}

export interface GameError {
  code: GameErrorCode
  message: string
}

export interface MutationResult {
  success: boolean
  errors: GameError[]
  view: PlayerPrivateView | null
}

export function isPlayPhase(phase: GamePhase): boolean {
  return phase !== 'LOBBY'
}

export function isFinishedPhase(phase: GamePhase): boolean {
  return phase === 'FINISHED'
}
