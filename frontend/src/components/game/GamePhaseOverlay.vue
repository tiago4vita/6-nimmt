<script setup lang="ts">
import type { GamePhase } from '@/graphql/types'

defineProps<{
  phase: GamePhase | null
}>()

const labels: Partial<Record<GamePhase, string>> = {
  DEAL: 'Dealing cards…',
  RESOLVE: 'Resolving plays…',
  SCORE: 'Updating scores…',
}
</script>

<template>
  <div
    v-if="phase && labels[phase]"
    class="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-black/30"
    role="status"
  >
    <div class="rounded-xl border border-border bg-surface-raised px-6 py-4 text-sm font-medium text-text">
      {{ labels[phase] }}
    </div>
  </div>
</template>
