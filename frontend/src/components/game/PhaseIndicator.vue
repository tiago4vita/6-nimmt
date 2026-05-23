<script setup lang="ts">
import type { GamePhase } from '@/graphql/types'

defineProps<{
  phase: GamePhase | null
  roundNumber: number
}>()

const labels: Record<GamePhase, string> = {
  LOBBY: 'Lobby',
  DEAL: 'Dealing',
  SUBMIT: 'Submit your card',
  RESOLVE: 'Resolving',
  SCORE: 'Scoring',
  FINISHED: 'Finished',
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-raised px-4 py-3">
    <div>
      <div class="text-xs uppercase tracking-wide text-muted">Phase</div>
      <div class="text-sm font-medium text-text">{{ phase ? labels[phase] : 'Loading…' }}</div>
    </div>
    <div class="h-8 w-px bg-border" />
    <div>
      <div class="text-xs uppercase tracking-wide text-muted">Round</div>
      <div class="text-sm font-medium text-text">{{ roundNumber }}</div>
    </div>
  </div>
</template>
