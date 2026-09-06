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
import { useSfx } from '@/composables/useSfx'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  roomId: string
}>()

const router = useRouter()
const { push: pushToast } = useToast()
const { playResults } = useSfx()
const showResults = ref(true)
const isRematching = ref(false)
const isLeaving = ref(false)
let resultsSfxPlayed = false

const {
  room,
  phase,
  players,
  rows,
  myPlayerId,
  isLoading,
  isReconnecting,
  leaveRoom,
  returnToLobby,
} = useGameRoom(toRef(props, 'roomId'))

watch(
  phase,
  (nextPhase) => {
    if (nextPhase === 'LOBBY') {
      resultsSfxPlayed = false
      void router.replace({ name: 'lobby', params: { roomId: props.roomId } })
      return
    }
    if (nextPhase && isPlayPhase(nextPhase) && !isFinishedPhase(nextPhase)) {
      void router.replace({ name: 'play', params: { roomId: props.roomId } })
    }
  },
  { immediate: true },
)

watch(
  [showResults, () => room.value?.winnerIds, myPlayerId],
  ([visible, winnerIds, playerId]) => {
    if (!visible) {
      resultsSfxPlayed = false
      return
    }
    if (resultsSfxPlayed || !playerId || winnerIds == null) {
      return
    }
    resultsSfxPlayed = true
    playResults(winnerIds, playerId)
  },
  { immediate: true },
)

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
    showResults.value = false
    await router.push({ name: 'home' })
  } finally {
    isLeaving.value = false
  }
}
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
      :finish-reason="room?.finishReason ?? null"
      :forfeited-player-ids="room?.forfeitedPlayerIds ?? null"
      :is-rematching="isRematching"
      :is-leaving="isLeaving"
      @rematch="handleRematch"
      @leave="handleExitRoom"
    />
  </AppShell>
</template>
