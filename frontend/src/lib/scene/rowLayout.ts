import { CARD, ROW_AREA, TABLE } from '@/lib/scene/constants'

export const ROW_TRACK = {
  /** First lane center on Z (rows stack away from camera). */
  originZ: -ROW_AREA.depth / 2 + 1.35,
  /** Horizontal spacing between cards within a row. */
  cardStep: CARD.width + CARD.gap,
  /** Slight embed into the felt zone — avoids z-fighting with table. */
  embed: 0.001,
} as const

export function rowLaneCenterZ(rowIndex: number): number {
  return ROW_TRACK.originZ + rowIndex * ROW_AREA.laneSpacing
}

export function rowLaneDividerZ(betweenRowIndex: number): number {
  return (rowLaneCenterZ(betweenRowIndex) + rowLaneCenterZ(betweenRowIndex + 1)) / 2
}

/** Face-up card on the table; card order matches subscription `row.cards`. */
export function rowCardPosition(
  cardIndex: number,
  rowIndex: number,
  cardCount: number,
): [number, number, number] {
  const span = Math.max(cardCount - 1, 0) * ROW_TRACK.cardStep
  const startX = -span / 2
  const x = startX + cardIndex * ROW_TRACK.cardStep
  const y = TABLE.y + CARD.depth / 2 + ROW_TRACK.embed
  const z = rowLaneCenterZ(rowIndex)
  return [x, y, z]
}
