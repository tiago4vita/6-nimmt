import type { Card } from '@/graphql/types'

import {
  CARD,
  handCardBaseY,
  handCardRotation,
  HAND_ANCHOR,
  HAND_FAN,
  PLAYFIELD,
} from '@/lib/scene/constants'

export interface FanSlot {
  card: Card
  position: [number, number, number]
  rotation: [number, number, number]
}

/** Ascending hand strip — aligned, uniform gap, camera-parallel tilt. */
export function computeFanLayout(cards: Card[]): FanSlot[] {
  const sorted = [...cards].sort((a, b) => a.value - b.value)
  const count = sorted.length
  if (count === 0) {
    return []
  }

  const step = CARD.width + HAND_FAN.gap
  const totalWidth = CARD.width + Math.max(count - 1, 0) * step
  const stripCenterX = PLAYFIELD.leftX + PLAYFIELD.width / 2
  const startX = stripCenterX - totalWidth / 2 + CARD.width / 2
  const rotation = handCardRotation()
  const baseY = handCardBaseY()

  return sorted.map((card, index) => ({
    card,
    position: [startX + index * step, baseY, HAND_ANCHOR.z],
    rotation,
  }))
}
