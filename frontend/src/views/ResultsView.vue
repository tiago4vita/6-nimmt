<script setup lang="ts">
import { ref, watch, toRef } from 'vue'
import { useRouter } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import ReconnectBanner from '@/components/feedback/ReconnectBanner.vue'
import GameBoard from '@/components/game/GameBoard.vue'
import PhaseIndicator from '@/components/game/PhaseIndicator.vue'
import PlayerStrip from '@/components/game/PlayerStrip.vue'
import ResultsOverlay from '@/components/game/ResultsOverlay.vue'
import { isFinishedPhase, isPlayPhase } from '@/graphql/types'
import { useGameRoom } from '@/composables/useGameRoom'

const props = defineProps<{
  roomId: string
}>()

const router = useRouter()
const showResults = ref(true)

const {
  room,
  phase,
  players,
  rows,
  myPlayerId,
  isLoading,
  isReconnecting,
} = useGameRoom(toRef(props, 'roomId'))

watch(
  phase,
  (nextPhase) => {
    if (nextPhase === 'LOBBY') {
      void router.replace({ name: 'lobby', params: { roomId: props.roomId } })
      return
    }
    if (nextPhase && isPlayPhase(nextPhase) && !isFinishedPhase(nextPhase)) {
      void router.replace({ name: 'play', params: { roomId: props.roomId } })
    }
  },
  { immediate: true },
)
</script>

<template>
  <AppShell>
    <ReconnectBanner :visible="isReconnecting && !isLoading" />

    <div v-if="isLoading" class="flex min-h-[40vh] items-center justify-center text-sm text-muted">
      Loading results…
    </div>

    <div v-else-if="room" class="space-y-4 opacity-70">
      <PhaseIndicator :phase="phase" :round-number="room.roundNumber" />
      <PlayerStrip :players="players" :my-player-id="myPlayerId" />
      <GameBoard :rows="rows" />
    </div>

    <ResultsOverlay
      :open="showResults"
      :players="players"
      :winner-ids="room?.winnerIds ?? null"
      @close="showResults = false"
    />
  </AppShell>
</template>
