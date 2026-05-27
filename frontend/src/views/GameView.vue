<script setup lang="ts">
import { computed, ref, watch, toRef } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue'
import ConnectionStatusBanner from '@/components/feedback/ConnectionStatusBanner.vue'
import CardConfirmBar from '@/components/game/CardConfirmBar.vue'
import GameScene from '@/components/game/scene/GameScene.vue'
import GameHudBar from '@/components/game/GameHudBar.vue'
import GamePhaseOverlay from '@/components/game/GamePhaseOverlay.vue'
import PlayerStrip from '@/components/game/PlayerStrip.vue'
import ResultsOverlay from '@/components/game/ResultsOverlay.vue'
import LoadingShell from '@/components/layout/LoadingShell.vue'
import { isFinishedPhase } from '@/graphql/types'
import { useCardSelection } from '@/composables/useCardSelection'
import { useGameRoom } from '@/composables/useGameRoom'
import { useGameShortcuts } from '@/composables/useGameShortcuts'
import { useStagingFlight } from '@/composables/useStagingFlight'
import { useToast } from '@/composables/useToast'
import { fanSlotStagingStart, findFanSlot } from '@/lib/scene/fanLayout'

const props = defineProps<{
  roomId: string
}>()

const router = useRouter()
const { push: pushToast } = useToast()

const {
  room,
  myHand,
  mySubmittedCard,
  phase,
  players,
  rows,
  myPlayerId,
  lastResolvedPlays,
  isLoading,
  isReconnecting,
  subscriptionError,
  submitCard,
  leaveRoom,
  returnToLobby,
} = useGameRoom(toRef(props, 'roomId'))

const roundNumber = computed(() => room.value?.roundNumber)

const showLeaveConfirm = ref(false)
const isLeaving = ref(false)
const isRematching = ref(false)
const showResults = ref(false)

const {
  selectedCardId,
  isHandLocked,
  isSubmitting,
  submitFailure,
  selectCard,
  selectCardByIndex,
  clearSelection,
  submitSelectedCard,
} = useCardSelection({
  myHand,
  mySubmittedCard,
  roundNumber,
  onSubmit: async (cardId) => submitCard(cardId),
})

const {
  flyingCardId,
  stagedYourCard,
  opponentVisible,
  beginYourFlight,
  cancelYourFlight,
  resetStaging,
  notifyOpponentSubmitted,
  registerOpponentOpacity,
} = useStagingFlight(() => {
  /* staged card committed in composable */
})

const selectedCard = computed(() => {
  const id = selectedCardId.value
  if (!id || mySubmittedCard.value) {
    return null
  }
  return myHand.value.find((card) => card.id === id) ?? null
})

const opponent = computed(() =>
  players.value.find((player) => player.id !== myPlayerId.value) ?? null,
)

const stagedCardDisplay = computed(
  () => stagedYourCard.value ?? mySubmittedCard.value,
)

const hiddenHandCardIds = computed(() => {
  const ids: string[] = []
  if (flyingCardId.value) {
    ids.push(flyingCardId.value)
  }
  return ids
})

const showConfirmOverlay = computed(
  () =>
    phase.value === 'SUBMIT' &&
    selectedCard.value !== null &&
    mySubmittedCard.value === null,
)

const handFrozen = computed(() => isSubmitting.value)

const shortcutHintCount = computed(() => Math.min(myHand.value.length, 9))

const submitDeadline = computed(() => room.value?.submitDeadline ?? null)

const timeoutMessage = ref<string | null>(null)
let timeoutMessageHandle: number | null = null

function clearTimeoutMessage(): void {
  if (timeoutMessageHandle !== null) {
    window.clearTimeout(timeoutMessageHandle)
    timeoutMessageHandle = null
  }
  timeoutMessage.value = null
}

function handleDeadline(): void {
  if (mySubmittedCard.value || phase.value !== 'SUBMIT') {
    return
  }
  if (selectedCardId.value) {
    void handleConfirm()
    return
  }
  const lowest = myHand.value.reduce<number | null>(
    (acc, card) => (acc === null || card.value < acc ? card.value : acc),
    null,
  )
  if (lowest === null) {
    return
  }
  timeoutMessage.value = `Time\u2019s up \u2014 playing your lowest card (${lowest})`
  if (timeoutMessageHandle !== null) {
    window.clearTimeout(timeoutMessageHandle)
  }
  timeoutMessageHandle = window.setTimeout(clearTimeoutMessage, 1800)
}

async function handleConfirm(): Promise<void> {
  const card = selectedCard.value
  if (!card || isHandLocked.value) {
    return
  }

  const slot = findFanSlot(myHand.value, card.id)
  if (slot) {
    await beginYourFlight(card, fanSlotStagingStart(slot, true))
  } else {
    const failure = await submitSelectedCard()
    if (failure) {
      cancelYourFlight()
    }
    return
  }

  const failure = await submitSelectedCard()
  if (failure) {
    cancelYourFlight()
  }
}

watch([phase, mySubmittedCard], ([nextPhase, submitted]) => {
  if (nextPhase !== 'SUBMIT' || submitted) {
    clearTimeoutMessage()
  }
})

watch(roundNumber, () => {
  resetStaging()
})

watch(phase, (nextPhase) => {
  if (nextPhase !== 'SUBMIT') {
    resetStaging()
  }
})

watch(
  () => [phase.value, opponent.value?.hasSubmitted] as const,
  ([currentPhase, submitted], previous) => {
    const wasSubmitted = previous?.[1] ?? false
    if (currentPhase === 'SUBMIT' && submitted && !wasSubmitted) {
      notifyOpponentSubmitted()
    }
  },
  { immediate: true },
)

const isSlowSubmit = ref(false)
let slowSubmitHandle: number | null = null

watch(isSubmitting, (submitting) => {
  if (slowSubmitHandle !== null) {
    window.clearTimeout(slowSubmitHandle)
    slowSubmitHandle = null
  }
  if (submitting) {
    slowSubmitHandle = window.setTimeout(() => {
      isSlowSubmit.value = true
    }, 3000)
  } else {
    isSlowSubmit.value = false
  }
})

const hasSelection = computed(
  () => selectedCardId.value !== null && mySubmittedCard.value === null,
)
const hasOpenDialog = computed(() => showLeaveConfirm.value || showResults.value)

useGameShortcuts({
  phase,
  isHandLocked,
  hasSelection,
  hasOpenDialog,
  selectByIndex: selectCardByIndex,
  confirmSelection: () => void handleConfirm(),
  clearSelection,
  openLeaveConfirm: () => {
    showLeaveConfirm.value = true
  },
})

const highlightedRowIndex = computed(() => {
  const lastPlay = lastResolvedPlays.value.at(-1)
  return lastPlay?.rowIndex ?? null
})

watch(
  phase,
  (nextPhase) => {
    if (nextPhase === 'LOBBY') {
      void router.replace({ name: 'lobby', params: { roomId: props.roomId } })
    }
    if (nextPhase && isFinishedPhase(nextPhase)) {
      showResults.value = true
    }
  },
  { immediate: true },
)

watch(submitFailure, (failure) => {
  if (!failure) {
    return
  }
  pushToast({
    message: failure.message,
    variant: 'error',
    details: failure.details ?? failure.code,
    action:
      failure.code === 'CLIENT_TIMEOUT' || failure.code === undefined
        ? { label: 'Retry', onClick: () => void handleConfirm() }
        : undefined,
  })
})

async function confirmLeave(): Promise<void> {
  isLeaving.value = true
  try {
    const errors = await leaveRoom()
    if (errors.length > 0) {
      pushToast({
        message: errors[0]?.message ?? 'Could not leave room',
        variant: 'error',
        details: errors[0]?.code,
      })
      return
    }
    showLeaveConfirm.value = false
    showResults.value = false
    await router.push({ name: 'home' })
  } finally {
    isLeaving.value = false
  }
}

async function handleRematch(): Promise<void> {
  isRematching.value = true
  try {
    const errors = await returnToLobby()
    if (errors.length > 0) {
      pushToast({
        message: errors[0]?.message ?? 'Could not return to lobby',
        variant: 'error',
        details: errors[0]?.code,
      })
      return
    }
    showResults.value = false
    await router.replace({ name: 'lobby', params: { roomId: props.roomId } })
  } finally {
    isRematching.value = false
  }
}

async function handleExitRoom(): Promise<void> {
  await confirmLeave()
}
</script>

<template>
  <AppShell>
    <ConnectionStatusBanner
      :is-reconnecting="isReconnecting && !isLoading"
      :is-slow-submit="isSlowSubmit"
    />
    <GamePhaseOverlay :phase="phase" :timeout-message="timeoutMessage" />

    <LoadingShell v-if="isLoading" variant="game" label="Loading game" />

    <div v-else-if="room" class="space-y-4">
      <GameHudBar
        :phase="phase"
        :round-number="room.roundNumber"
        :room-code="room.code"
        :submit-deadline="submitDeadline"
        :last-resolved-plays="lastResolvedPlays"
        :players="players"
        :my-player-id="myPlayerId"
        @deadline="handleDeadline"
        @leave="showLeaveConfirm = true"
      />
      <PlayerStrip :players="players" :my-player-id="myPlayerId" :phase="phase" />

      <div class="crt-game relative h-[min(640px,65vh)] w-full">
        <GameScene
          :rows="rows"
          :my-hand="myHand"
          :selected-card-id="selectedCardId"
          :submitted-card-id="mySubmittedCard?.id ?? null"
          :hidden-hand-card-ids="hiddenHandCardIds"
          :hand-disabled="isHandLocked || phase !== 'SUBMIT'"
          :hand-frozen="handFrozen"
          :highlighted-row-index="highlightedRowIndex"
          :staged-your-card="stagedCardDisplay"
          :opponent-staging-visible="opponentVisible"
          @register-opponent-opacity="registerOpponentOpacity"
          @select="selectCard"
        />

        <div
          v-if="showConfirmOverlay"
          class="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4"
        >
          <div class="pointer-events-auto">
            <CardConfirmBar
              :card="selectedCard"
              :is-submitting="isSubmitting"
              @confirm="handleConfirm"
              @cancel="clearSelection"
            />
          </div>
        </div>

        <p
          v-if="mySubmittedCard && phase === 'SUBMIT'"
          class="pointer-events-none absolute inset-x-0 bottom-4 z-10 text-center text-xs font-medium text-success"
        >
          Submitted — waiting for opponent
        </p>
      </div>

      <p
        v-if="phase === 'SUBMIT' && !mySubmittedCard"
        class="text-center text-[11px] uppercase tracking-wide text-muted"
      >
        Click a card in the fan · 1–{{ shortcutHintCount }} quick select · Enter to play · Esc to cancel
      </p>

      <p v-if="subscriptionError" class="text-sm text-danger">{{ subscriptionError }}</p>
    </div>

    <ResultsOverlay
      :open="showResults"
      :players="players"
      :winner-ids="room?.winnerIds ?? null"
      :is-rematching="isRematching"
      :is-leaving="isLeaving"
      @rematch="handleRematch"
      @leave="handleExitRoom"
    />

    <ConfirmDialog
      :open="showLeaveConfirm"
      title="Leave room?"
      message="You will return to the home screen."
      confirm-label="Leave room"
      @confirm="confirmLeave"
      @cancel="showLeaveConfirm = false"
    />
  </AppShell>
</template>
