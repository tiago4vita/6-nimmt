import { CARD, ROW_AREA, TABLE } from '@/lib/scene/constants'

export const ROW_TRACK = {
  cardStep: CARD.width + CARD.gap,
  embed: 0.001,
} as const

/** Rows recede from the camera (decreasing Z). */
export function rowLaneCenterZ(rowIndex: number): number {
  return ROW_AREA.originZ - rowIndex * ROW_AREA.laneSpacing
}

export function rowLaneDividerZ(betweenRowIndex: number): number {
  return (rowLaneCenterZ(betweenRowIndex) + rowLaneCenterZ(betweenRowIndex + 1)) / 2
}

export function rowLaneCenterX(): number {
  return ROW_AREA.leftX + ROW_AREA.width / 2
}

/** Face-up card on the table; grows right from the left anchor. */
export function rowCardPosition(
  cardIndex: number,
  rowIndex: number,
): [number, number, number] {
  const x = ROW_AREA.leftX + cardIndex * ROW_TRACK.cardStep + CARD.width / 2
  const y = TABLE.y + CARD.depth / 2 + ROW_TRACK.embed
  const z = rowLaneCenterZ(rowIndex)
  return [x, y, z]
}
