import { onBeforeUnmount, ref, type Ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'

import type { Card } from '@/graphql/types'
import { STAGING } from '@/lib/scene/constants'
import {
  animateStagingFlight,
  cancelStagingFlightAnimation,
  clearStagingFlight,
} from '@/lib/scene/stagingFlightRuntime'
import {
  stagingSlotTransform,
  type StagingTransform,
} from '@/lib/scene/stagingLayout'

export function useStagingFlight(
  onYourFlightComplete: (cardId: string) => void,
): {
  flyingCardId: Ref<string | null>
  stagedYourCard: Ref<Card | null>
  opponentVisible: Ref<boolean>
  beginYourFlight: (card: Card, from: StagingTransform) => void
  cancelYourFlight: () => void
  resetStaging: () => void
  notifyOpponentSubmitted: () => void
  registerOpponentOpacity: (setter: ((opacity: number) => void) | null) => void
} {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const flyingCardId = ref<string | null>(null)
  const stagedYourCard = ref<Card | null>(null)
  const opponentVisible = ref(false)

  let opponentRafId = 0
  let opponentFadeStart = 0
  let opponentOpacitySetter: ((opacity: number) => void) | null = null

  function stopOpponentFade(): void {
    if (opponentRafId) {
      cancelAnimationFrame(opponentRafId)
      opponentRafId = 0
    }
  }

  function setOpponentOpacity(opacity: number): void {
    opponentOpacitySetter?.(opacity)
  }

  function registerOpponentOpacity(setter: ((opacity: number) => void) | null): void {
    opponentOpacitySetter = setter
    if (setter && opponentVisible.value) {
      setter(1)
    }
  }

  function resetStaging(): void {
    cancelStagingFlightAnimation()
    stopOpponentFade()
    clearStagingFlight()
    flyingCardId.value = null
    stagedYourCard.value = null
    opponentVisible.value = false
    opponentOpacitySetter?.(0)
  }

  function cancelYourFlight(): void {
    cancelStagingFlightAnimation()
    flyingCardId.value = null
  }

  function completeYourFlight(card: Card): void {
    stagedYourCard.value = card
    flyingCardId.value = null
    onYourFlightComplete(card.id)
  }

  function beginYourFlight(card: Card, from: StagingTransform): void {
    cancelStagingFlightAnimation()
    stagedYourCard.value = null
    flyingCardId.value = card.id

    const to = stagingSlotTransform()

    if (reducedMotion.value) {
      completeYourFlight(card)
      return
    }

    animateStagingFlight(card, from, to, STAGING.durationMs, () => {
      completeYourFlight(card)
    })
  }

  function tickOpponentFade(now: number): void {
    const linearT = Math.min(1, (now - opponentFadeStart) / STAGING.opponentFadeDurationMs)
    setOpponentOpacity(linearT)
    if (linearT < 1) {
      opponentRafId = requestAnimationFrame(tickOpponentFade)
      return
    }
    opponentRafId = 0
    setOpponentOpacity(1)
  }

  function notifyOpponentSubmitted(): void {
    if (opponentVisible.value) {
      return
    }

    opponentVisible.value = true

    if (reducedMotion.value) {
      setOpponentOpacity(1)
      return
    }

    stopOpponentFade()
    setOpponentOpacity(0)
    opponentFadeStart = performance.now()
    opponentRafId = requestAnimationFrame(tickOpponentFade)
  }

  onBeforeUnmount(() => {
    cancelStagingFlightAnimation()
    stopOpponentFade()
  })

  return {
    flyingCardId,
    stagedYourCard,
    opponentVisible,
    beginYourFlight,
    cancelYourFlight,
    resetStaging,
    notifyOpponentSubmitted,
    registerOpponentOpacity,
  }
}
