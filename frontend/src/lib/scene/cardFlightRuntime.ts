import type { Group } from 'three'

import type { Card } from '@/graphql/types'
import { CARD_MOTION } from '@/lib/scene/constants'
import { sampleCardArc, type CardTransform } from '@/lib/scene/stagingLayout'

const ARC_STEPS = 16

export interface CardFlightOptions {
  showBack?: boolean
  /** When showBack, reveal face after this flight fraction (0–1). */
  faceRevealAt?: number
}

let targetGroup: Group | null = null
let faceUpdater:
  | ((value: number, bones: number, showBack: boolean, linearT: number) => void)
  | null = null
let arcSamples: CardTransform[] | null = null
let rafId = 0
let startTime = 0
let durationMs = 0
let onComplete: (() => void) | null = null
let activeFlight: { card: Card; options: CardFlightOptions } | null = null

export function registerCardFlightGroup(group: Group | null): void {
  targetGroup = group
  if (group) {
    group.visible = false
  }
}

export function registerCardFlightFaceUpdater(
  updater:
    | ((value: number, bones: number, showBack: boolean, linearT: number) => void)
    | null,
): void {
  faceUpdater = updater
}

function resolveShowBack(linearT: number, options: CardFlightOptions): boolean {
  if (!options.showBack) {
    return false
  }
  const revealAt = options.faceRevealAt ?? CARD_MOTION.faceRevealAt
  return linearT < revealAt
}

function applyFlightSample(index: number, linearT: number): void {
  if (!arcSamples || !targetGroup || !activeFlight) {
    return
  }

  const sample = arcSamples[index]!
  targetGroup.position.set(...sample.position)
  targetGroup.rotation.set(...sample.rotation)
  faceUpdater?.(
    activeFlight.card.value,
    activeFlight.card.bones,
    resolveShowBack(linearT, activeFlight.options),
    linearT,
  )
}

export function animateCardFlight(
  card: Card,
  from: CardTransform,
  to: CardTransform,
  duration: number,
  complete: () => void,
  options: CardFlightOptions = {},
): void {
  cancelCardFlight()

  arcSamples = Array.from({ length: ARC_STEPS + 1 }, (_, index) =>
    sampleCardArc(from, to, index / ARC_STEPS),
  )

  activeFlight = { card, options }
  if (targetGroup) {
    targetGroup.visible = true
    applyFlightSample(0, 0)
  }

  durationMs = duration
  startTime = performance.now()
  onComplete = complete
  rafId = requestAnimationFrame(tickCardFlight)
}

function finishFlight(): void {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  arcSamples = null
  activeFlight = null
  if (targetGroup) {
    targetGroup.visible = false
  }
  const done = onComplete
  onComplete = null
  done?.()
}

export function cancelCardFlight(): void {
  finishFlight()
}

export function clearCardFlight(): void {
  finishFlight()
}

function tickCardFlight(now: number): void {
  if (!arcSamples || !targetGroup) {
    finishFlight()
    return
  }

  const linearT = Math.min(1, (now - startTime) / durationMs)
  const easedT = easeOutCubic(linearT)
  const index = Math.min(ARC_STEPS, Math.round(easedT * ARC_STEPS))
  applyFlightSample(index, linearT)

  if (linearT < 1) {
    rafId = requestAnimationFrame(tickCardFlight)
    return
  }

  finishFlight()
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export const DEFAULT_FLIGHT_DURATION_MS = CARD_MOTION.durationMs
