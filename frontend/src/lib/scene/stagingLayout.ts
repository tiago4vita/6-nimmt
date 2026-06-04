import { MathUtils } from 'three'

import {
  CARD,
  CARD_MOTION,
  PLAYFIELD,
  STAGING,
  stagingRotation,
  stagingSurfaceY,
} from '@/lib/scene/constants'
import { rowCardPosition } from '@/lib/scene/rowLayout'

export interface CardTransform {
  position: [number, number, number]
  rotation: [number, number, number]
}

/** @deprecated Use CardTransform */
export type StagingTransform = CardTransform

/** Shared bottom-right staging slot — same world position for you and opponent. */
export function stagingSlotTransform(): CardTransform {
  return {
    position: [
      PLAYFIELD.leftX + PLAYFIELD.width - STAGING.slot.insetRight - CARD.width / 2,
      stagingSurfaceY(),
      PLAYFIELD.frontZ - STAGING.slot.insetFromFront,
    ],
    rotation: stagingRotation(),
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Smoothstep easing — cheaper than double easeOutCubic per frame. */
function easeSmoothstep(t: number): number {
  const clamped = MathUtils.clamp(t, 0, 1)
  return clamped * clamped * (3 - 2 * clamped)
}

/** Face-up card resting flat on a row lane. */
export function rowSlotTransform(
  cardIndex: number,
  rowIndex: number,
): CardTransform {
  return {
    position: rowCardPosition(cardIndex, rowIndex),
    rotation: [-Math.PI / 2, 0, 0],
  }
}

/** Rotation progress — stays at source pose until flipDelay, then eases to target. */
function rotationProgress(linearT: number): number {
  const delay = CARD_MOTION.flipDelay
  if (linearT <= delay) {
    return 0
  }
  return easeSmoothstep((linearT - delay) / (1 - delay))
}

/** Parabolic arc with delayed flip rotation — used for every card flight path. */
export function sampleCardArc(
  from: CardTransform,
  to: CardTransform,
  linearT: number,
): CardTransform {
  const t = easeSmoothstep(linearT)
  const rotT = rotationProgress(linearT)
  const arcLift = STAGING.arcHeight * 4 * t * (1 - t)

  return {
    position: [
      lerp(from.position[0], to.position[0], t),
      lerp(from.position[1], to.position[1], t) + arcLift,
      lerp(from.position[2], to.position[2], t),
    ],
    rotation: [
      lerp(from.rotation[0], to.rotation[0], rotT),
      lerp(from.rotation[1], to.rotation[1], rotT),
      lerp(from.rotation[2], to.rotation[2], rotT),
    ],
  }
}

/** @deprecated Use sampleCardArc */
export const sampleStagingArc = sampleCardArc
