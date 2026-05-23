import { computed, ref, watch, type Ref } from 'vue'

import type { Card, GameError } from '@/graphql/types'

interface UseCardSelectionOptions {
  myHand: Ref<Card[]>
  mySubmittedCard: Ref<Card | null>
  onSubmit: (cardId: string) => Promise<GameError[]>
}

export function useCardSelection({ myHand, mySubmittedCard, onSubmit }: UseCardSelectionOptions) {
  const selectedCardId = ref<string | null>(null)
  const optimisticSelectedId = ref<string | null>(null)
  const isSubmitting = ref(false)
  const submitError = ref<string | null>(null)

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
    }
  })

  function selectCard(cardId: string): void {
    if (isHandLocked.value) {
      return
    }
    selectedCardId.value = cardId
  }

  async function submitSelectedCard(): Promise<void> {
    const cardId = selectedCardId.value
    if (!cardId || isHandLocked.value) {
      return
    }

    isSubmitting.value = true
    submitError.value = null
    optimisticSelectedId.value = cardId

    try {
      const errors = await onSubmit(cardId)
      if (errors.length > 0) {
        submitError.value = errors[0]?.message ?? 'Could not submit card'
        optimisticSelectedId.value = null
        isSubmitting.value = false
      }
    } catch (error) {
      submitError.value = error instanceof Error ? error.message : 'Could not submit card'
      optimisticSelectedId.value = null
      isSubmitting.value = false
    }
  }

  async function submitCard(cardId: string): Promise<void> {
    selectedCardId.value = cardId
    await submitSelectedCard()
  }

  function selectCardByIndex(index: number): void {
    const card = myHand.value[index]
    if (card) {
      selectCard(card.id)
    }
  }

  return {
    selectedCardId,
    optimisticSelectedId,
    isSubmitting,
    isHandLocked,
    submitError,
    selectCard,
    selectCardByIndex,
    submitSelectedCard,
    submitCard,
  }
}
