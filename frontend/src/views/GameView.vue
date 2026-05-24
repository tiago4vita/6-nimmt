<script setup lang="ts">
import { computed, ref, watch, toRef } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue'
import ConnectionStatusBanner from '@/components/feedback/ConnectionStatusBanner.vue'
import CardConfirmBar from '@/components/game/CardConfirmBar.vue'
import CardHand from '@/components/game/CardHand.vue'
import GameBoard from '@/components/game/GameBoard.vue'
import GameHudBar from '@/components/game/GameHudBar.vue'
import GamePhaseOverlay from '@/components/game/GamePhaseOverlay.vue'
import PlayerStrip from '@/components/game/PlayerStrip.vue'
import ResultsOverlay from '@/components/game/ResultsOverlay.vue'
import LoadingShell from '@/components/layout/LoadingShell.vue'
import { isFinishedPhase } from '@/graphql/types'
import { useCardSelection } from '@/composables/useCardSelection'
import { useGameRoom } from '@/composables/useGameRoom'
import { useGameShortcuts } from '@/composables/useGameShortcuts'
import { useToast } from '@/composables/useToast'

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
  optimisticSelectedId,
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

const selectedCard = computed(() => {
  const id = selectedCardId.value
  if (!id || mySubmittedCard.value) {
    return null
  }
  return myHand.value.find((card) => card.id === id) ?? null
})

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
    void submitSelectedCard()
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

watch([phase, mySubmittedCard], ([nextPhase, submitted]) => {
  if (nextPhase !== 'SUBMIT' || submitted) {
    clearTimeoutMessage()
  }
})

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
  confirmSelection: () => void submitSelectedCard(),
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
        ? { label: 'Retry', onClick: () => void submitSelectedCard() }
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
      <GameBoard :rows="rows" :highlighted-row-index="highlightedRowIndex" />

      <section class="space-y-3 rounded-xl border border-border bg-surface-raised p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-text">Your hand</h2>
          <span v-if="mySubmittedCard" class="text-xs text-success">
            Submitted — waiting for others
          </span>
          <span
            v-else-if="phase === 'SUBMIT' && !selectedCardId"
            class="text-xs text-muted"
          >
            Select a card, then confirm
          </span>
          <span
            v-else-if="phase === 'SUBMIT' && selectedCardId"
            class="text-xs text-accent"
          >
            Ready — confirm to play
          </span>
        </div>

        <p
          v-if="phase === 'SUBMIT' && !mySubmittedCard"
          class="text-[11px] uppercase tracking-wide text-muted"
        >
          1–{{ Math.min(myHand.length, 9) }} quick select · Enter to play · Esc to cancel
        </p>

        <CardHand
          :cards="myHand"
          :selected-card-id="selectedCardId"
          :optimistic-selected-id="optimisticSelectedId"
          :submitted-card-id="mySubmittedCard?.id ?? null"
          :disabled="isHandLocked || phase !== 'SUBMIT'"
          :is-submitting="isSubmitting"
          @select="selectCard"
        />

        <CardConfirmBar
          :card="selectedCard"
          :is-submitting="isSubmitting"
          @confirm="submitSelectedCard"
          @cancel="clearSelection"
        />
      </section>

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
