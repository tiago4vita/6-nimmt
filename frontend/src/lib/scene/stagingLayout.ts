import { MathUtils } from 'three'

import {
  CARD,
  PLAYFIELD,
  STAGING,
  stagingRotation,
  stagingSurfaceY,
} from '@/lib/scene/constants'

export interface StagingTransform {
  position: [number, number, number]
  rotation: [number, number, number]
}

/** Shared bottom-right staging slot — same world position for you and opponent. */
export function stagingSlotTransform(): StagingTransform {
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

/** Parabolic arc with flip-down rotation from hand pose to staging pose. */
export function sampleStagingArc(
  from: StagingTransform,
  to: StagingTransform,
  linearT: number,
): StagingTransform {
  const t = easeSmoothstep(linearT)
  const arcLift = STAGING.arcHeight * 4 * t * (1 - t)

  return {
    position: [
      lerp(from.position[0], to.position[0], t),
      lerp(from.position[1], to.position[1], t) + arcLift,
      lerp(from.position[2], to.position[2], t),
    ],
    rotation: [
      lerp(from.rotation[0], to.rotation[0], t),
      lerp(from.rotation[1], to.rotation[1], t),
      lerp(from.rotation[2], to.rotation[2], t),
    ],
  }
}
