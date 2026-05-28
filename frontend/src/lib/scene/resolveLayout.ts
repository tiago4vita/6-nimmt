import type { Card, ResolvedPlay, Row } from '@/graphql/types'
import { CARD, PLAYFIELD, stagingSurfaceY } from '@/lib/scene/constants'
import type { CardTransform } from '@/lib/scene/stagingLayout'

export type ResolveOutcome = 'normal' | 'row_full' | 'too_low'

export function cloneRows(rows: Row[]): Row[] {
  return rows.map((row) => ({
    ...row,
    cards: [...row.cards],
  }))
}

export function findPreResolveRow(rows: Row[], rowIndex: number | null): Row | undefined {
  if (rowIndex === null) {
    return undefined
  }
  return rows.find((row) => row.index === rowIndex)
}

/** Infer Rule A / B / C from pre-resolve row snapshot (GraphQL has no collectedRow flag). */
export function classifyResolveOutcome(
  play: ResolvedPlay,
  preRow: Row | undefined,
): ResolveOutcome {
  if (play.bonesTaken === 0) {
    return 'normal'
  }

  if (!preRow || preRow.cards.length === 0) {
    return 'too_low'
  }

  const tail = preRow.cards[preRow.cards.length - 1]
  if (preRow.cards.length === 5 && tail && play.card.value > tail.value) {
    return 'row_full'
  }

  return 'too_low'
}

/** Bone pile anchor — near player for you, deep-left for opponent. */
export function bonePileTransform(
  playerId: string,
  myPlayerId: string | null,
  stackIndex = 0,
): CardTransform {
  const isYou = myPlayerId !== null && playerId === myPlayerId
  const stackOffset = stackIndex * 0.04

  if (isYou) {
    return {
      position: [
        PLAYFIELD.leftX + PLAYFIELD.width - 1.35 - stackOffset,
        stagingSurfaceY() + 0.015,
        PLAYFIELD.frontZ - 0.65,
      ],
      rotation: [-Math.PI / 2, 0, 0],
    }
  }

  return {
    position: [
      PLAYFIELD.leftX + 1.35 + stackOffset,
      stagingSurfaceY() + 0.015,
      PLAYFIELD.frontZ - PLAYFIELD.depth + 1.35,
    ],
    rotation: [-Math.PI / 2, 0, 0],
  }
}

export function ruleCToastMessage(): string {
  return 'Card too low — auto-collected row with fewest bones.'
}

/** Post-resolve placement index for Rule A (card already in subscription rows). */
export function normalPlacementIndex(rows: Row[], play: ResolvedPlay): number {
  if (play.rowIndex === null) {
    return 0
  }
  const row = rows.find((entry) => entry.index === play.rowIndex)
  const index = row?.cards.findIndex((card) => card.id === play.card.id) ?? -1
  return index >= 0 ? index : Math.max(0, (row?.cards.length ?? 1) - 1)
}

export function removeCardFromOverlay(rows: Row[], cardId: string): Row[] {
  return rows.map((row) => ({
    ...row,
    cards: row.cards.filter((card) => card.id !== cardId),
  }))
}

export function setOverlayRowCards(rows: Row[], rowIndex: number, cards: Card[]): Row[] {
  return rows.map((row) =>
    row.index === rowIndex ? { ...row, cards: [...cards] } : row,
  )
}

export const ROW_SHAKE_AMPLITUDE = CARD.width * 0.045
