import type { Group } from 'three'

import type { Card } from '@/graphql/types'
import { sampleStagingArc, type StagingTransform } from '@/lib/scene/stagingLayout'

const ARC_STEPS = 14

let targetGroup: Group | null = null
let faceUpdater: ((value: number, bones: number) => void) | null = null
let arcSamples: StagingTransform[] | null = null
let rafId = 0
let startTime = 0
let durationMs = 0
let onComplete: (() => void) | null = null

export function registerStagingFlightGroup(group: Group | null): void {
  targetGroup = group
  if (group) {
    group.visible = false
  }
}

export function registerStagingFlightFaceUpdater(
  updater: ((value: number, bones: number) => void) | null,
): void {
  faceUpdater = updater
}

export function animateStagingFlight(
  card: Card,
  from: StagingTransform,
  to: StagingTransform,
  duration: number,
  complete: () => void,
): void {
  cancelStagingFlightAnimation()

  arcSamples = Array.from({ length: ARC_STEPS + 1 }, (_, index) =>
    sampleStagingArc(from, to, index / ARC_STEPS),
  )

  faceUpdater?.(card.value, card.bones)
  if (targetGroup) {
    targetGroup.visible = true
    const first = arcSamples[0]!
    targetGroup.position.set(...first.position)
    targetGroup.rotation.set(...first.rotation)
  }

  durationMs = duration
  startTime = performance.now()
  onComplete = complete
  rafId = requestAnimationFrame(tickStagingFlight)
}

export function cancelStagingFlightAnimation(): void {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  arcSamples = null
  onComplete = null
  if (targetGroup) {
    targetGroup.visible = false
  }
}

export function clearStagingFlight(): void {
  cancelStagingFlightAnimation()
}

function tickStagingFlight(now: number): void {
  if (!arcSamples || !targetGroup) {
    return
  }

  const linearT = Math.min(1, (now - startTime) / durationMs)
  const index = Math.min(ARC_STEPS, Math.round(linearT * ARC_STEPS))
  const sample = arcSamples[index]!
  targetGroup.position.set(...sample.position)
  targetGroup.rotation.set(...sample.rotation)

  if (linearT < 1) {
    rafId = requestAnimationFrame(tickStagingFlight)
    return
  }

  rafId = 0
  arcSamples = null
  targetGroup.visible = false
  const done = onComplete
  onComplete = null
  done?.()
}
