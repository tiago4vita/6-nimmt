import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import type { CardMotionStep } from '@/composables/useCardMotionQueue'
import { useCardMotionQueue } from '@/composables/useCardMotionQueue'
import type { Card, GamePhase, ResolvedPlay, Row } from '@/graphql/types'
import { fanSlotStagingStart, findFanSlot } from '@/lib/scene/fanLayout'
import { rowSlotTransform, stagingSlotTransform } from '@/lib/scene/stagingLayout'

function resolvePlaysKey(plays: ResolvedPlay[]): string {
  return plays.map((play) => play.card.id).join(',')
}

/**
 * Staging visibility rules (submit phase only):
 * - Your card: server submission, or a short-lived local pending card after hand→staging flight.
 * - Hidden while that card is in the flight mesh, during resolve, or until submissions clear after resolve.
 * - Opponent back: derived from hasSubmitted; fade-in runs once per submission via the motion queue.
 */
export function useGameMotion(options: {
  phase: ComputedRef<GamePhase | null>
  roundNumber: ComputedRef<number | undefined>
  rows: ComputedRef<Row[]>
  lastResolvedPlays: ComputedRef<ResolvedPlay[]>
  myPlayerId: ComputedRef<string | null>
  myHand: ComputedRef<Card[]>
  mySubmittedCard: ComputedRef<Card | null>
  opponentHasSubmitted: ComputedRef<boolean>
}): {
  flyingCardId: Ref<string | null>
  stagingYourCard: ComputedRef<Card | null>
  opponentStagingVisible: ComputedRef<boolean>
  displayRows: ComputedRef<Row[]>
  activeResolveRowIndex: Ref<number | null>
  isMotionActive: Ref<boolean>
  isResolving: Ref<boolean>
  beginYourFlight: (card: Card) => Promise<void>
  resetMotion: () => void
  registerOpponentOpacity: (setter: ((opacity: number) => void) | null) => void
  motionDebug: ReturnType<typeof useCardMotionQueue>['debug']
} {
  const pendingYourCard = ref<Card | null>(null)
  const suppressYourStagingAfterResolve = ref(false)
  const opponentRevealQueued = ref(false)

  const hiddenRowCardIds = ref<Set<string>>(new Set())
  const activeResolveRowIndex = ref<number | null>(null)
  const isResolving = ref(false)
  const seenResolveKey = ref<string | null>(null)
  const resolveWatchReady = ref(false)

  let opponentOpacitySetter: ((opacity: number) => void) | null = null

  const {
    enqueue,
    flush,
    flyingCardId,
    debug: motionDebug,
  } = useCardMotionQueue((opacity) => {
    opponentOpacitySetter?.(opacity)
  })

  const isMotionActive = computed(
    () => motionDebug.isAnimating.value || isResolving.value,
  )

  const opponentStagingVisible = computed(
    () =>
      options.phase.value === 'SUBMIT' &&
      !isResolving.value &&
      options.opponentHasSubmitted.value,
  )

  const stagingYourCard = computed((): Card | null => {
    if (options.phase.value !== 'SUBMIT' || isResolving.value) {
      return null
    }
    if (suppressYourStagingAfterResolve.value) {
      return null
    }

    const card = pendingYourCard.value ?? options.mySubmittedCard.value
    if (!card || flyingCardId.value === card.id) {
      return null
    }

    return card
  })

  const displayRows = computed(() => {
    const hidden = hiddenRowCardIds.value
    if (hidden.size === 0) {
      return options.rows.value
    }
    return options.rows.value.map((row) => ({
      ...row,
      cards: row.cards.filter((card) => !hidden.has(card.id)),
    }))
  })

  function registerOpponentOpacity(setter: ((opacity: number) => void) | null): void {
    opponentOpacitySetter = setter
    if (setter && opponentStagingVisible.value) {
      setter(1)
    }
  }

  function clearSubmitStagingState(): void {
    pendingYourCard.value = null
    suppressYourStagingAfterResolve.value = false
    opponentRevealQueued.value = false
    opponentOpacitySetter?.(0)
  }

  function resetMotion(): void {
    flush()
    clearSubmitStagingState()
    hiddenRowCardIds.value = new Set()
    activeResolveRowIndex.value = null
    isResolving.value = false
  }

  function canShowYourStaging(): boolean {
    return (
      options.phase.value === 'SUBMIT' &&
      !isResolving.value &&
      !suppressYourStagingAfterResolve.value
    )
  }

  async function beginYourFlight(card: Card): Promise<void> {
    pendingYourCard.value = null

    const slot = findFanSlot(options.myHand.value, card.id)
    if (!slot) {
      if (canShowYourStaging()) {
        pendingYourCard.value = card
      }
      return
    }

    await enqueue({
      type: 'HAND_TO_STAGING',
      cardId: card.id,
      card,
      from: fanSlotStagingStart(slot, true),
      to: stagingSlotTransform(),
    })

    if (canShowYourStaging()) {
      pendingYourCard.value = card
    }
  }

  function findRowCardIndex(rows: Row[], play: ResolvedPlay): number {
    if (play.rowIndex === null) {
      return 0
    }
    const row = rows.find((entry) => entry.index === play.rowIndex)
    const index = row?.cards.findIndex((c) => c.id === play.card.id) ?? -1
    return index >= 0 ? index : (row?.cards.length ?? 1) - 1
  }

  function buildResolveSteps(
    plays: ResolvedPlay[],
    rows: Row[],
    myPlayerId: string | null,
  ): CardMotionStep[] {
    const staging = stagingSlotTransform()
    const steps: CardMotionStep[] = []

    for (const play of plays) {
      const isOpponent = play.playerId !== myPlayerId
      const rowIndex = play.rowIndex ?? 0
      const cardIndex = findRowCardIndex(rows, play)

      steps.push({
        type: 'STAGING_TO_ROW',
        cardId: play.card.id,
        card: play.card,
        from: staging,
        to: rowSlotTransform(cardIndex, rowIndex),
        showBack: isOpponent,
        rowIndex: play.rowIndex,
      })

      if (play.bonesTaken > 0) {
        steps.push({
          type: 'ROW_TAKE',
          cardId: `${play.card.id}-take`,
          card: play.card,
          from: staging,
          to: staging,
          rowIndex: play.rowIndex,
          pauseMs: 460,
        })
      }
    }

    return steps
  }

  async function runResolveSequence(plays: ResolvedPlay[]): Promise<void> {
    if (isResolving.value) {
      return
    }

    isResolving.value = true
    pendingYourCard.value = null
    opponentRevealQueued.value = false
    opponentOpacitySetter?.(0)
    hiddenRowCardIds.value = new Set(plays.map((play) => play.card.id))

    const steps = buildResolveSteps(
      plays,
      options.rows.value,
      options.myPlayerId.value,
    )

    try {
      for (const step of steps) {
        if (step.type === 'STAGING_TO_ROW') {
          activeResolveRowIndex.value = step.rowIndex ?? null
        }

        await enqueue(step)

        if (step.type === 'STAGING_TO_ROW') {
          hiddenRowCardIds.value = new Set(
            [...hiddenRowCardIds.value].filter((id) => id !== step.cardId),
          )
        }
      }
    } catch (error) {
      console.error('[useGameMotion] resolve sequence failed', error)
      flush()
    } finally {
      activeResolveRowIndex.value = null
      hiddenRowCardIds.value = new Set()
      isResolving.value = false
      suppressYourStagingAfterResolve.value = options.mySubmittedCard.value !== null
    }
  }

  watch(
    () => options.mySubmittedCard.value,
    (card) => {
      if (card) {
        pendingYourCard.value = null
        return
      }
      pendingYourCard.value = null
      suppressYourStagingAfterResolve.value = false
    },
  )

  watch(opponentStagingVisible, (visible) => {
    if (!visible) {
      opponentRevealQueued.value = false
      opponentOpacitySetter?.(0)
      return
    }

    if (opponentRevealQueued.value || isResolving.value) {
      return
    }

    opponentRevealQueued.value = true
    void enqueue({
      type: 'OPPONENT_REVEAL',
      cardId: '__opponent__',
      card: { id: '__opponent__', value: 0, bones: 0 },
      from: stagingSlotTransform(),
      to: stagingSlotTransform(),
    })
  })

  watch(
    () => options.lastResolvedPlays.value,
    (plays) => {
      if (plays.length === 0) {
        return
      }

      const key = resolvePlaysKey(plays)

      if (!resolveWatchReady.value) {
        resolveWatchReady.value = true
        seenResolveKey.value = key
        return
      }

      if (seenResolveKey.value === key) {
        return
      }

      seenResolveKey.value = key
      void runResolveSequence(plays)
    },
    { immediate: true },
  )

  watch(
    () => options.roundNumber.value,
    (round, previous) => {
      if (previous === undefined || round === previous) {
        return
      }
      clearSubmitStagingState()
    },
  )

  watch(options.phase, (phase, previous) => {
    if (phase === 'LOBBY' || phase === 'DEAL') {
      seenResolveKey.value = null
      resolveWatchReady.value = false
      resetMotion()
      return
    }

    if (phase !== 'SUBMIT' && previous === 'SUBMIT') {
      clearSubmitStagingState()
    }
  })

  return {
    flyingCardId,
    stagingYourCard,
    opponentStagingVisible,
    displayRows,
    activeResolveRowIndex,
    isMotionActive,
    isResolving,
    beginYourFlight,
    resetMotion,
    registerOpponentOpacity,
    motionDebug,
  }
}
