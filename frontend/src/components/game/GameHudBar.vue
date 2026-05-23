<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft } from 'lucide-vue-next'

import CardTile from '@/components/game/CardTile.vue'
import SubmitCountdown from '@/components/game/SubmitCountdown.vue'
import IconButton from '@/components/layout/IconButton.vue'
import type { GamePhase, PlayerPublic, ResolvedPlay } from '@/graphql/types'

const props = defineProps<{
  phase: GamePhase | null
  roundNumber: number
  roomCode: string
  submitDeadline: string | null
  lastResolvedPlays?: ResolvedPlay[]
  players?: PlayerPublic[]
}>()

const emit = defineEmits<{
  deadline: []
  leave: []
}>()

const phaseLabels: Record<GamePhase, string> = {
  LOBBY: 'Lobby',
  DEAL: 'Dealing',
  SUBMIT: 'Submit',
  RESOLVE: 'Resolving',
  SCORE: 'Scoring',
  FINISHED: 'Finished',
}

const resolvedPlays = computed(() => props.lastResolvedPlays ?? [])

const showLastResolve = computed(() => resolvedPlays.value.length > 0)

function playerName(playerId: string): string {
  return (
    props.players?.find((player) => player.id === playerId)?.displayName ??
    'Player'
  )
}

function playTitle(play: ResolvedPlay): string {
  const bones =
    play.bonesTaken > 0 ? `${play.bonesTaken} bones` : 'no bones taken'
  return `${playerName(play.playerId)} · ${bones}`
}
</script>

<template>
  <div
    class="rounded-md border border-border bg-surface-raised px-4 py-3"
  >
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3 text-sm">
        <IconButton
          :icon="ArrowLeft"
          ariaLabel="Leave room"
          title="Leave room (Esc)"
          size="sm"
          @click="emit('leave')"
        />
        <div class="h-8 w-px bg-border" />
        <div>
          <div class="text-[10px] uppercase tracking-wide text-muted">Round</div>
          <div class="font-medium tabular-nums text-text">{{ roundNumber }}</div>
        </div>
        <div class="h-8 w-px bg-border" />
        <div>
          <div class="text-[10px] uppercase tracking-wide text-muted">Phase</div>
          <div class="font-medium text-text">
            {{ phase ? phaseLabels[phase] : 'Loading' }}
          </div>
        </div>
        <div class="h-8 w-px bg-border" />
        <div>
          <div class="text-[10px] uppercase tracking-wide text-muted">Room</div>
          <div class="font-medium tracking-[0.18em] text-accent">
            {{ roomCode }}
          </div>
        </div>
      </div>

      <SubmitCountdown
        :deadline="submitDeadline"
        :phase="phase"
        :size="48"
        :stroke-width="4"
        @deadline="emit('deadline')"
      />
    </div>

    <div
      v-if="showLastResolve"
      class="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3"
    >
      <span class="text-[10px] uppercase tracking-wide text-muted">
        Last resolve
      </span>
      <div
        v-for="(play, index) in resolvedPlays"
        :key="`${play.playerId}-${play.card.id}-${index}`"
        class="flex flex-col items-center gap-1 resolve-feed-item"
        :style="{ animationDelay: `${index * 80}ms` }"
        :title="playTitle(play)"
      >
        <CardTile :card="play.card" size="sm" />
        <span class="max-w-14 truncate text-[10px] text-text">
          {{ playerName(play.playerId) }}
        </span>
        <span
          v-if="play.bonesTaken > 0"
          class="text-[10px] tabular-nums text-danger"
        >
          {{ play.bonesTaken }}🦴
        </span>
      </div>
    </div>
  </div>
</template>
