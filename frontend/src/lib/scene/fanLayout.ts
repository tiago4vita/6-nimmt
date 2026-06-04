import { MathUtils } from 'three'

import type { Card } from '@/graphql/types'

import {
  CARD,
  handCardBaseY,
  handCardRotation,
  HAND_ANCHOR,
  HAND_FAN,
  HAND_MOTION,
  PLAYFIELD,
} from '@/lib/scene/constants'
import type { StagingTransform } from '@/lib/scene/stagingLayout'

export interface FanSlot {
  card: Card
  position: [number, number, number]
  rotation: [number, number, number]
}

function fanYawRad(index: number, count: number): number {
  const centerIndex = (count - 1) / 2
  const offsetFromCenter = index - centerIndex
  return MathUtils.degToRad(offsetFromCenter * HAND_FAN.yawDegPerStep)
}

/** Ascending hand strip with Balatro-style Y-axis fan rotation from center. */
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
  const [pitchX] = handCardRotation()
  const baseY = handCardBaseY()

  return sorted.map((card, index) => ({
    card,
    position: [startX + index * step, baseY, HAND_ANCHOR.z],
    rotation: [pitchX, fanYawRad(index, count), 0],
  }))
}

export function findFanSlot(hand: Card[], cardId: string): FanSlot | null {
  return computeFanLayout(hand).find((slot) => slot.card.id === cardId) ?? null
}

/** Hand slot pose for staging arc start (includes selected Z pop if applicable). */
export function fanSlotStagingStart(slot: FanSlot, selected = false): StagingTransform {
  const zLift = selected ? HAND_MOTION.selectedPopZ : 0
  return {
    position: [slot.position[0], slot.position[1], slot.position[2] + zLift],
    rotation: [...slot.rotation],
  }
}
