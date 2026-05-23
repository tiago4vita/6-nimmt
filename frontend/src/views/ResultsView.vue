<script setup lang="ts">
import { ref, watch, toRef } from 'vue'
import { useRouter } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import ConnectionStatusBanner from '@/components/feedback/ConnectionStatusBanner.vue'
import LoadingShell from '@/components/layout/LoadingShell.vue'
import GameBoard from '@/components/game/GameBoard.vue'
import GameHudBar from '@/components/game/GameHudBar.vue'
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
    <ConnectionStatusBanner :is-reconnecting="isReconnecting && !isLoading" />

    <LoadingShell v-if="isLoading" variant="game" label="Loading results" />

    <div v-else-if="room" class="space-y-4 opacity-70">
      <GameHudBar
        :phase="phase"
        :round-number="room.roundNumber"
        :room-code="room.code"
        :submit-deadline="null"
      />
      <PlayerStrip :players="players" :my-player-id="myPlayerId" :phase="phase" />
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
