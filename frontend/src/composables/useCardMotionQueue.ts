import { onBeforeUnmount, ref, type Ref } from 'vue'

import type { Card } from '@/graphql/types'
import {
  animateCardFlight,
  cancelCardFlight,
  DEFAULT_FLIGHT_DURATION_MS,
} from '@/lib/scene/cardFlightRuntime'
import { CARD_MOTION } from '@/lib/scene/constants'
import type { CardTransform } from '@/lib/scene/stagingLayout'

export type CardMotionStepType =
  | 'HAND_TO_STAGING'
  | 'STAGING_TO_ROW'
  | 'ROW_TAKE'
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
}

interface QueuedStep extends CardMotionStep {
  resolve: () => void
}

export interface CardMotionQueueDebug {
  queueLength: Ref<number>
  currentStepIndex: Ref<number>
  currentStep: Ref<CardMotionStep | null>
  isAnimating: Ref<boolean>
}

export function useCardMotionQueue(
  onOpponentOpacity?: (opacity: number) => void,
): {
  enqueue: (step: CardMotionStep) => Promise<void>
  enqueueMany: (steps: CardMotionStep[]) => Promise<void>
  flush: () => void
  flyingCardId: Ref<string | null>
  debug: CardMotionQueueDebug
} {
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
    flyingCardId.value = null
  }

  function sleep(ms: number, gen: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (gen === generation) {
          resolve()
        }
      }, ms)
    })
  }

  function runFlight(step: CardMotionStep, gen: number): Promise<void> {
    return new Promise((resolve) => {
      if (gen !== generation) {
        resolve()
        return
      }

      flyingCardId.value = step.cardId
      const duration = step.durationMs ?? DEFAULT_FLIGHT_DURATION_MS

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
      onOpponentOpacity?.(0)
      opponentFadeStart = performance.now()
      const duration = step.durationMs ?? DEFAULT_FLIGHT_DURATION_MS

      function tick(now: number): void {
        if (gen !== generation) {
          finishOpponentReveal()
          return
        }

        const linearT = Math.min(1, (now - opponentFadeStart) / duration)
        const eased = 1 - (1 - linearT) ** 2
        onOpponentOpacity?.(eased)
        if (linearT < 1) {
          opponentRafId = requestAnimationFrame(tick)
          return
        }

        opponentRafId = 0
        onOpponentOpacity?.(1)
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
        await runFlight(step, gen)
        break
      case 'OPPONENT_REVEAL':
        await runOpponentReveal(step, gen)
        break
      case 'ROW_TAKE':
        await sleep(step.pauseMs ?? 420, gen)
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
          await sleep(CARD_MOTION.stepGapMs, gen)
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
    onOpponentOpacity?.(0)

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
