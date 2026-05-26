import { computed, ref, watch, type Ref } from 'vue'

import type { Card, GameError, GameErrorCode } from '@/graphql/types'

export interface SubmitFailure {
  message: string
  code?: GameErrorCode | 'CLIENT_TIMEOUT'
  details?: string
}

interface UseCardSelectionOptions {
  myHand: Ref<Card[]>
  mySubmittedCard: Ref<Card | null>
  roundNumber: Ref<number | undefined>
  onSubmit: (cardId: string) => Promise<GameError[]>
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

export function useCardSelection({
  myHand,
  mySubmittedCard,
  roundNumber,
  onSubmit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseCardSelectionOptions) {
  const selectedCardId = ref<string | null>(null)
  const optimisticSelectedId = ref<string | null>(null)
  const isSubmitting = ref(false)
  const submitFailure = ref<SubmitFailure | null>(null)

  const isHandLocked = computed(
    () =>
      isSubmitting.value ||
      optimisticSelectedId.value !== null ||
      mySubmittedCard.value !== null,
  )

  watch(mySubmittedCard, (submitted) => {
    if (submitted) {
      optimisticSelectedId.value = null
      selectedCardId.value = submitted.id
      isSubmitting.value = false
      return
    }

    selectedCardId.value = null
    optimisticSelectedId.value = null
    isSubmitting.value = false
    submitFailure.value = null
  })

  watch(roundNumber, () => {
    selectedCardId.value = null
    optimisticSelectedId.value = null
    isSubmitting.value = false
    submitFailure.value = null
  })

  function selectCard(cardId: string): void {
    if (isHandLocked.value) {
      return
    }
    selectedCardId.value = cardId
  }

  function clearSelection(): void {
    if (isSubmitting.value || optimisticSelectedId.value !== null) {
      return
    }
    selectedCardId.value = null
  }

  function selectCardByIndex(index: number): void {
    const sorted = [...myHand.value].sort((a, b) => a.value - b.value)
    const card = sorted[index]
    if (card) {
      selectCard(card.id)
    }
  }

  async function submitSelectedCard(): Promise<SubmitFailure | null> {
    const cardId = selectedCardId.value
    if (!cardId || isHandLocked.value) {
      return null
    }

    isSubmitting.value = true
    submitFailure.value = null
    optimisticSelectedId.value = cardId

    const timeoutPromise = new Promise<{ kind: 'timeout' }>((resolve) => {
      window.setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs)
    })
    const submitPromise = onSubmit(cardId).then((errors) => ({
      kind: 'response' as const,
      errors,
    }))

    try {
      const outcome = await Promise.race([submitPromise, timeoutPromise])

      if (outcome.kind === 'timeout') {
        const failure: SubmitFailure = {
          message:
            'Your card wasn\u2019t registered \u2014 the server didn\u2019t respond in time. Try again.',
          code: 'CLIENT_TIMEOUT',
          details: `Submit timed out after ${timeoutMs}ms`,
        }
        submitFailure.value = failure
        optimisticSelectedId.value = null
        isSubmitting.value = false
        return failure
      }

      if (outcome.errors.length > 0) {
        const first = outcome.errors[0]
        const failure: SubmitFailure = {
          message: first?.message ?? 'Could not submit card',
          code: first?.code,
          details: first?.code ? `${first.code}` : undefined,
        }
        submitFailure.value = failure
        optimisticSelectedId.value = null
        isSubmitting.value = false
        return failure
      }

      if (!mySubmittedCard.value) {
        optimisticSelectedId.value = null
        isSubmitting.value = false
      }
      return null
    } catch (error) {
      const failure: SubmitFailure = {
        message:
          error instanceof Error ? error.message : 'Could not submit card',
        details: error instanceof Error ? error.stack : undefined,
      }
      submitFailure.value = failure
      optimisticSelectedId.value = null
      isSubmitting.value = false
      return failure
    }
  }

  async function submitCard(cardId: string): Promise<SubmitFailure | null> {
    selectedCardId.value = cardId
    return submitSelectedCard()
  }

  return {
    selectedCardId,
    optimisticSelectedId,
    isSubmitting,
    isHandLocked,
    submitFailure,
    selectCard,
    selectCardByIndex,
    clearSelection,
    submitSelectedCard,
    submitCard,
  }
}
