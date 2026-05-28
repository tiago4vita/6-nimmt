import { onBeforeUnmount, ref, type Ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'

import type { Card } from '@/graphql/types'
import {
  animateCardFlight,
  cancelCardFlight,
  DEFAULT_FLIGHT_DURATION_MS,
} from '@/lib/scene/cardFlightRuntime'
import { CARD_MOTION, RESOLVE_MOTION } from '@/lib/scene/constants'

import type { CardTransform } from '@/lib/scene/stagingLayout'

export type CardMotionStepType =
  | 'HAND_TO_STAGING'
  | 'STAGING_TO_ROW'
  | 'ROW_COLLECT'
  | 'ROW_REPOSITION'
  | 'ROW_SHAKE'
  | 'RESOLVE_BEAT'
  | 'SHOW_TOAST'
  | 'BONE_POP'
  | 'STAGING_RETURN'
  | 'OPPONENT_REVEAL'

export interface CardMotionStep {
  type: CardMotionStepType
  cardId: string
  card: Card
  from: CardTransform
  to: CardTransform
  durationMs?: number
  showBack?: boolean
  rowIndex?: number | null
  pauseMs?: number
  message?: string
  playerId?: string
  bonesTaken?: number
}

interface QueuedStep extends CardMotionStep {
  resolve: () => void
}

export interface CardMotionQueueCallbacks {
  onOpponentOpacity?: (opacity: number) => void
  onRowShake?: (rowIndex: number | null) => void
  onResolveToast?: (message: string) => void
  onBonePop?: (playerId: string, bonesTaken: number) => void
}

export interface CardMotionQueueDebug {
  queueLength: Ref<number>
  currentStepIndex: Ref<number>
  currentStep: Ref<CardMotionStep | null>
  isAnimating: Ref<boolean>
}

export function useCardMotionQueue(callbacks: CardMotionQueueCallbacks = {}): {
  enqueue: (step: CardMotionStep) => Promise<void>
  enqueueMany: (steps: CardMotionStep[]) => Promise<void>
  flush: () => void
  flyingCardId: Ref<string | null>
  debug: CardMotionQueueDebug
} {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  const queue: QueuedStep[] = []
  const flyingCardId = ref<string | null>(null)
  const currentStep = ref<CardMotionStep | null>(null)
  const currentStepIndex = ref(0)
  const isAnimating = ref(false)
  const queueLength = ref(0)

  let processing = false
  let cancelled = false
  let generation = 0
  let opponentRafId = 0
  let opponentFadeStart = 0
  let opponentRevealResolve: (() => void) | null = null

  function stepGapMs(): number {
    return reducedMotion.value
      ? CARD_MOTION.reducedStepGapMs
      : CARD_MOTION.stepGapMs
  }

  function isCollectOrReposition(type: CardMotionStepType): boolean {
    return type === 'ROW_COLLECT' || type === 'ROW_REPOSITION'
  }

  function gapAfterStep(step: CardMotionStep, nextStep: CardMotionStep): number {
    if (isCollectOrReposition(step.type) && isCollectOrReposition(nextStep.type)) {
      return reducedMotion.value
        ? CARD_MOTION.reducedStepGapMs
        : RESOLVE_MOTION.collectStepGapMs
    }
    return stepGapMs()
  }

  function updateQueueLength(): void {
    queueLength.value = queue.length + (currentStep.value ? 1 : 0)
  }

  function finishOpponentReveal(): void {
    if (opponentRafId) {
      cancelAnimationFrame(opponentRafId)
      opponentRafId = 0
    }
    const done = opponentRevealResolve
    opponentRevealResolve = null
    done?.()
  }

  function abortActiveStep(): void {
    cancelCardFlight()
    finishOpponentReveal()
    callbacks.onRowShake?.(null)
    flyingCardId.value = null
  }

  function sleep(ms: number, gen: number): Promise<void> {
    const duration = reducedMotion.value ? Math.min(ms, 60) : ms
    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (gen === generation) {
          resolve()
        }
      }, duration)
    })
  }

  function runFlight(step: CardMotionStep, gen: number): Promise<void> {
    return new Promise((resolve) => {
      if (gen !== generation) {
        resolve()
        return
      }

      flyingCardId.value = step.cardId
      const duration = reducedMotion.value
        ? Math.min(step.durationMs ?? DEFAULT_FLIGHT_DURATION_MS, 80)
        : (step.durationMs ?? DEFAULT_FLIGHT_DURATION_MS)

      animateCardFlight(
        step.card,
        step.from,
        step.to,
        duration,
        () => {
          if (gen === generation) {
            flyingCardId.value = null
          }
          resolve()
        },
        { showBack: step.showBack },
      )
    })
  }

  function runOpponentReveal(step: CardMotionStep, gen: number): Promise<void> {
    return new Promise((resolve) => {
      if (gen !== generation) {
        resolve()
        return
      }

      finishOpponentReveal()
      opponentRevealResolve = resolve
      callbacks.onOpponentOpacity?.(0)
      opponentFadeStart = performance.now()
      const duration = reducedMotion.value
        ? 60
        : (step.durationMs ?? DEFAULT_FLIGHT_DURATION_MS)

      function tick(now: number): void {
        if (gen !== generation) {
          finishOpponentReveal()
          return
        }

        const linearT = Math.min(1, (now - opponentFadeStart) / duration)
        const eased = 1 - (1 - linearT) ** 2
        callbacks.onOpponentOpacity?.(eased)
        if (linearT < 1) {
          opponentRafId = requestAnimationFrame(tick)
          return
        }

        opponentRafId = 0
        callbacks.onOpponentOpacity?.(1)
        finishOpponentReveal()
      }

      opponentRafId = requestAnimationFrame(tick)
    })
  }

  async function executeStep(step: CardMotionStep, gen: number): Promise<void> {
    switch (step.type) {
      case 'HAND_TO_STAGING':
      case 'STAGING_TO_ROW':
      case 'STAGING_RETURN':
      case 'ROW_COLLECT':
      case 'ROW_REPOSITION':
        await runFlight(step, gen)
        break
      case 'OPPONENT_REVEAL':
        await runOpponentReveal(step, gen)
        break
      case 'ROW_SHAKE':
        callbacks.onRowShake?.(step.rowIndex ?? null)
        await sleep(step.pauseMs ?? 420, gen)
        callbacks.onRowShake?.(null)
        break
      case 'RESOLVE_BEAT':
        await sleep(step.pauseMs ?? 360, gen)
        break
      case 'SHOW_TOAST':
        if (step.message) {
          callbacks.onResolveToast?.(step.message)
        }
        await sleep(step.pauseMs ?? 120, gen)
        break
      case 'BONE_POP':
        if (step.playerId && step.bonesTaken && step.bonesTaken > 0) {
          callbacks.onBonePop?.(step.playerId, step.bonesTaken)
        }
        break
      default:
        break
    }
  }

  async function processQueue(): Promise<void> {
    if (processing) {
      return
    }

    const gen = generation
    processing = true
    isAnimating.value = true

    try {
      while (queue.length > 0 && !cancelled && gen === generation) {
        const next = queue.shift()!
        updateQueueLength()
        currentStep.value = next
        currentStepIndex.value += 1

        await executeStep(next, gen)

        if (gen !== generation) {
          break
        }

        next.resolve()

        if (queue.length > 0 && !cancelled && gen === generation) {
          await sleep(gapAfterStep(next, queue[0]!), gen)
        }
      }
    } finally {
      if (gen === generation) {
        currentStep.value = null
        flyingCardId.value = null
        isAnimating.value = false
        processing = false
        updateQueueLength()
      }
    }
  }

  function enqueue(step: CardMotionStep): Promise<void> {
    return new Promise((resolve) => {
      queue.push({ ...step, resolve })
      updateQueueLength()
      void processQueue()
    })
  }

  async function enqueueMany(steps: CardMotionStep[]): Promise<void> {
    for (const step of steps) {
      await enqueue(step)
    }
  }

  function flush(): void {
    generation += 1
    cancelled = true
    abortActiveStep()
    callbacks.onOpponentOpacity?.(0)

    while (queue.length > 0) {
      const step = queue.shift()!
      step.resolve()
    }

    currentStep.value = null
    flyingCardId.value = null
    currentStepIndex.value = 0
    isAnimating.value = false
    processing = false
    cancelled = false
    updateQueueLength()
  }

  onBeforeUnmount(() => {
    flush()
  })

  return {
    enqueue,
    enqueueMany,
    flush,
    flyingCardId,
    debug: {
      queueLength,
      currentStepIndex,
      currentStep,
      isAnimating,
    },
  }
}
