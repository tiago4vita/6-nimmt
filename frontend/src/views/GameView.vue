<script setup lang="ts">
import { computed, ref, watch, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

import AppShell from '@/components/layout/AppShell.vue'
import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue'
import ReconnectBanner from '@/components/feedback/ReconnectBanner.vue'
import CardHand from '@/components/game/CardHand.vue'
import GameBoard from '@/components/game/GameBoard.vue'
import GamePhaseOverlay from '@/components/game/GamePhaseOverlay.vue'
import PhaseIndicator from '@/components/game/PhaseIndicator.vue'
import PlayerStrip from '@/components/game/PlayerStrip.vue'
import ResolveFeed from '@/components/game/ResolveFeed.vue'
import ResultsOverlay from '@/components/game/ResultsOverlay.vue'
import SubmissionProgress from '@/components/game/SubmissionProgress.vue'
import { isFinishedPhase } from '@/graphql/types'
import { useCardSelection } from '@/composables/useCardSelection'
import { useGameRoom } from '@/composables/useGameRoom'
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
  submissionProgress,
  isLoading,
  isSubscriptionConnected,
  subscriptionError,
  submitCard,
  leaveRoom,
} = useGameRoom(toRef(props, 'roomId'))

const showLeaveConfirm = ref(false)
const isLeaving = ref(false)
const showResults = ref(false)

const {
  selectedCardId,
  optimisticSelectedId,
  isHandLocked,
  submitError,
  submitCard: submitCardFromHand,
} = useCardSelection({
  myHand,
  mySubmittedCard,
  onSubmit: async (cardId) => {
    const errors = await submitCard(cardId)
    return errors
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

watch(submitError, (message) => {
  if (message) {
    pushToast(message, 'error')
  }
})

async function confirmLeave(): Promise<void> {
  isLeaving.value = true
  try {
    const errors = await leaveRoom()
    if (errors.length > 0) {
      pushToast(errors[0]?.message ?? 'Could not leave room', 'error')
      return
    }
    showLeaveConfirm.value = false
    await router.push({ name: 'home' })
  } finally {
    isLeaving.value = false
  }
}
</script>

<template>
  <AppShell>
    <ReconnectBanner :visible="!isSubscriptionConnected && !isLoading" />
    <GamePhaseOverlay :phase="phase" />

    <div v-if="isLoading" class="flex min-h-[40vh] items-center justify-center text-sm text-muted">
      Loading game…
    </div>

    <div v-else-if="room" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 text-sm text-muted hover:text-text"
          @click="showLeaveConfirm = true"
        >
          <ArrowLeft class="size-4" aria-hidden="true" />
          Leave
        </button>
        <div class="text-sm text-muted">
          Room <span class="font-medium text-accent">{{ room.code }}</span>
        </div>
      </div>

      <PhaseIndicator :phase="phase" :round-number="room.roundNumber" />
      <SubmissionProgress :progress="submissionProgress" />
      <PlayerStrip :players="players" :my-player-id="myPlayerId" />
      <GameBoard :rows="rows" :highlighted-row-index="highlightedRowIndex" />
      <ResolveFeed :plays="lastResolvedPlays" :players="players" />

      <section class="rounded-xl border border-border bg-surface-raised p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-medium text-text">Your hand</h2>
          <span v-if="mySubmittedCard" class="text-xs text-success">Submitted</span>
          <span v-else-if="phase === 'SUBMIT'" class="text-xs text-muted">Click a card to submit</span>
        </div>
        <CardHand
          :cards="myHand"
          :selected-card-id="selectedCardId"
          :optimistic-selected-id="optimisticSelectedId"
          :disabled="isHandLocked || phase !== 'SUBMIT'"
          @submit="submitCardFromHand"
        />
      </section>

      <p v-if="subscriptionError" class="text-sm text-danger">{{ subscriptionError }}</p>
    </div>

    <ResultsOverlay
      :open="showResults"
      :players="players"
      :winner-ids="room?.winnerIds ?? null"
      @close="showResults = false"
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
