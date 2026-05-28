import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

import type { CardMotionStep } from '@/composables/useCardMotionQueue'
import { useCardMotionQueue } from '@/composables/useCardMotionQueue'
import type { Card, GamePhase, ResolvedPlay, Row } from '@/graphql/types'
import { RESOLVE_MOTION } from '@/lib/scene/constants'
import { fanSlotStagingStart, findFanSlot } from '@/lib/scene/fanLayout'
import {
  bonePileTransform,
  classifyResolveOutcome,
  cloneRows,
  findPreResolveRow,
  normalPlacementIndex,
  removeCardFromOverlay,
  ruleCToastMessage,
  setOverlayRowCards,
} from '@/lib/scene/resolveLayout'
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
  onResolveToast?: (message: string) => void
}): {
  flyingCardId: Ref<string | null>
  stagingYourCard: ComputedRef<Card | null>
  opponentStagingVisible: ComputedRef<boolean>
  displayRows: ComputedRef<Row[]>
  activeResolveRowIndex: Ref<number | null>
  shakingRowIndex: Ref<number | null>
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
  const resolveRowOverlay = ref<Row[] | null>(null)
  const activeResolveRowIndex = ref<number | null>(null)
  const shakingRowIndex = ref<number | null>(null)
  const isResolving = ref(false)
  const seenResolveKey = ref<string | null>(null)
  const resolveWatchReady = ref(false)
  const rowsBeforeUpdate = ref<Row[]>([])

  let opponentOpacitySetter: ((opacity: number) => void) | null = null

  const {
    enqueue,
    flush,
    flyingCardId,
    debug: motionDebug,
  } = useCardMotionQueue({
    onOpponentOpacity: (opacity) => {
      opponentOpacitySetter?.(opacity)
    },
    onRowShake: (rowIndex) => {
      shakingRowIndex.value = rowIndex
    },
    onResolveToast: (message) => {
      options.onResolveToast?.(message)
    },
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
    const source = resolveRowOverlay.value ?? options.rows.value
    const hidden = hiddenRowCardIds.value
    if (hidden.size === 0) {
      return source
    }
    return source.map((row) => ({
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
    resolveRowOverlay.value = null
    activeResolveRowIndex.value = null
    shakingRowIndex.value = null
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

  function buildRowCollectSteps(
    play: ResolvedPlay,
    cards: Card[],
    rowIndex: number,
    myPlayerId: string | null,
  ): CardMotionStep[] {
    return cards.map((card, index) => ({
      type: 'ROW_COLLECT' as const,
      cardId: card.id,
      card,
      from: rowSlotTransform(index, rowIndex),
      to: bonePileTransform(play.playerId, myPlayerId, index),
      rowIndex: play.rowIndex,
      playerId: play.playerId,
      durationMs: RESOLVE_MOTION.rowCollectMs,
    }))
  }

  function buildResolveSteps(
    plays: ResolvedPlay[],
    preRows: Row[],
    postRows: Row[],
    myPlayerId: string | null,
  ): CardMotionStep[] {
    const staging = stagingSlotTransform()
    const steps: CardMotionStep[] = []

    for (const play of plays) {
      const isOpponent = play.playerId !== myPlayerId
      const rowIndex = play.rowIndex ?? 0
      const preRow = findPreResolveRow(preRows, play.rowIndex)
      const outcome = classifyResolveOutcome(play, preRow)

      if (outcome === 'too_low') {
        steps.push({
          type: 'SHOW_TOAST',
          cardId: `${play.card.id}-toast`,
          card: play.card,
          from: staging,
          to: staging,
          message: ruleCToastMessage(),
          rowIndex: play.rowIndex,
        })
        steps.push({
          type: 'RESOLVE_BEAT',
          cardId: `${play.card.id}-beat-c`,
          card: play.card,
          from: staging,
          to: staging,
          pauseMs: RESOLVE_MOTION.ruleCBeatMs,
          rowIndex: play.rowIndex,
        })
        steps.push({
          type: 'ROW_SHAKE',
          cardId: `${play.card.id}-shake`,
          card: play.card,
          from: staging,
          to: staging,
          rowIndex: play.rowIndex,
          pauseMs: RESOLVE_MOTION.rowShakeMs,
        })

        if (preRow) {
          steps.push(
            ...buildRowCollectSteps(play, preRow.cards, rowIndex, myPlayerId),
          )
        }

        steps.push({
          type: 'STAGING_TO_ROW',
          cardId: play.card.id,
          card: play.card,
          from: staging,
          to: rowSlotTransform(0, rowIndex),
          showBack: isOpponent,
          rowIndex: play.rowIndex,
        })
        continue
      }

      if (outcome === 'row_full' && preRow) {
        const sixthIndex = preRow.cards.length

        steps.push({
          type: 'STAGING_TO_ROW',
          cardId: play.card.id,
          card: play.card,
          from: staging,
          to: rowSlotTransform(sixthIndex, rowIndex),
          showBack: isOpponent,
          rowIndex: play.rowIndex,
        })
        steps.push({
          type: 'RESOLVE_BEAT',
          cardId: `${play.card.id}-beat-b`,
          card: play.card,
          from: staging,
          to: staging,
          pauseMs: RESOLVE_MOTION.ruleBBeatMs,
          rowIndex: play.rowIndex,
        })
        steps.push({
          type: 'ROW_SHAKE',
          cardId: `${play.card.id}-shake-b`,
          card: play.card,
          from: staging,
          to: staging,
          rowIndex: play.rowIndex,
          pauseMs: RESOLVE_MOTION.rowShakeMs,
        })
        steps.push(
          ...buildRowCollectSteps(play, preRow.cards, rowIndex, myPlayerId),
        )
        steps.push({
          type: 'ROW_REPOSITION',
          cardId: `${play.card.id}-reposition`,
          card: play.card,
          from: rowSlotTransform(sixthIndex, rowIndex),
          to: rowSlotTransform(0, rowIndex),
          rowIndex: play.rowIndex,
          durationMs: RESOLVE_MOTION.rowRepositionMs,
        })
        continue
      }

      const cardIndex = normalPlacementIndex(postRows, play)
      steps.push({
        type: 'STAGING_TO_ROW',
        cardId: play.card.id,
        card: play.card,
        from: staging,
        to: rowSlotTransform(cardIndex, rowIndex),
        showBack: isOpponent,
        rowIndex: play.rowIndex,
      })
    }

    return steps
  }

  function applyOverlayAfterStep(
    step: CardMotionStep,
    overlay: Row[],
    preRows: Row[],
    playByCardId: Map<string, ResolvedPlay>,
  ): Row[] {
    const rowIndex = step.rowIndex ?? 0
    const play = playByCardId.get(step.card.id) ?? playByCardId.get(step.cardId)

    switch (step.type) {
      case 'STAGING_TO_ROW': {
        if (!play) {
          return overlay
        }
        const preRow = findPreResolveRow(preRows, play.rowIndex)
        const outcome = classifyResolveOutcome(play, preRow)
        if (outcome === 'row_full' && preRow) {
          return setOverlayRowCards(overlay, rowIndex, [
            ...preRow.cards,
            play.card,
          ])
        }
        if (outcome === 'too_low') {
          return setOverlayRowCards(overlay, rowIndex, [play.card])
        }
        const row = overlay.find((entry) => entry.index === rowIndex)
        if (!row) {
          return overlay
        }
        if (row.cards.some((card) => card.id === play.card.id)) {
          return overlay
        }
        return setOverlayRowCards(overlay, rowIndex, [...row.cards, play.card])
      }
      case 'ROW_COLLECT':
        return removeCardFromOverlay(overlay, step.cardId)
      case 'ROW_REPOSITION': {
        if (!play) {
          return overlay
        }
        return setOverlayRowCards(overlay, rowIndex, [play.card])
      }
      default:
        return overlay
    }
  }

  async function runResolveSequence(
    plays: ResolvedPlay[],
    preRows: Row[],
  ): Promise<void> {
    if (isResolving.value) {
      return
    }

    isResolving.value = true
    pendingYourCard.value = null
    opponentRevealQueued.value = false
    opponentOpacitySetter?.(0)
    hiddenRowCardIds.value = new Set(plays.map((play) => play.card.id))
    resolveRowOverlay.value = cloneRows(preRows)

    const playByCardId = new Map<string, ResolvedPlay>()
    for (const play of plays) {
      playByCardId.set(play.card.id, play)
    }

    const steps = buildResolveSteps(
      plays,
      preRows,
      options.rows.value,
      options.myPlayerId.value,
    )

    try {
      for (const step of steps) {
        if (
          step.type === 'STAGING_TO_ROW' ||
          step.type === 'ROW_SHAKE' ||
          step.type === 'ROW_COLLECT' ||
          step.type === 'ROW_REPOSITION' ||
          step.type === 'SHOW_TOAST' ||
          step.type === 'RESOLVE_BEAT'
        ) {
          activeResolveRowIndex.value = step.rowIndex ?? null
        }

        if (step.type === 'ROW_COLLECT') {
          hiddenRowCardIds.value = new Set([
            ...hiddenRowCardIds.value,
            step.cardId,
          ])
        }

        if (step.type === 'ROW_REPOSITION') {
          hiddenRowCardIds.value = new Set([
            ...hiddenRowCardIds.value,
            step.card.id,
          ])
        }

        await enqueue(step)

        if (resolveRowOverlay.value) {
          resolveRowOverlay.value = applyOverlayAfterStep(
            step,
            resolveRowOverlay.value,
            preRows,
            playByCardId,
          )
        }

        if (step.type === 'STAGING_TO_ROW' && step.cardId === step.card.id) {
          hiddenRowCardIds.value = new Set(
            [...hiddenRowCardIds.value].filter((id) => id !== step.cardId),
          )
        }

        if (step.type === 'ROW_REPOSITION') {
          hiddenRowCardIds.value = new Set(
            [...hiddenRowCardIds.value].filter((id) => id !== step.card.id),
          )
        }
      }
    } catch (error) {
      console.error('[useGameMotion] resolve sequence failed', error)
      flush()
    } finally {
      activeResolveRowIndex.value = null
      shakingRowIndex.value = null
      hiddenRowCardIds.value = new Set()
      resolveRowOverlay.value = null
      isResolving.value = false
      suppressYourStagingAfterResolve.value = options.mySubmittedCard.value !== null
    }
  }

  watch(
    () => options.rows.value,
    (rows, previous) => {
      if (previous) {
        rowsBeforeUpdate.value = previous
      } else if (rows.length > 0) {
        rowsBeforeUpdate.value = rows
      }
    },
  )

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
      const preRows =
        rowsBeforeUpdate.value.length > 0
          ? rowsBeforeUpdate.value
          : options.rows.value
      void runResolveSequence(plays, cloneRows(preRows))
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
    shakingRowIndex,
    isMotionActive,
    isResolving,
    beginYourFlight,
    resetMotion,
    registerOpponentOpacity,
    motionDebug,
  }
}
