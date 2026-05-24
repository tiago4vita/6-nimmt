<script setup lang="ts">
import { computed } from 'vue'
import type { GamePhase } from '@/graphql/types'

const props = defineProps<{
  phase: GamePhase | null
  timeoutMessage?: string | null
}>()

const phaseLabels: Partial<Record<GamePhase, string>> = {
  DEAL: 'Dealing cards…',
  RESOLVE: 'Resolving plays…',
  SCORE: 'Updating scores…',
}

const visibleLabel = computed(() => {
  if (props.timeoutMessage) {
    return props.timeoutMessage
  }
  return props.phase ? phaseLabels[props.phase] : null
})

const tone = computed(() =>
  props.timeoutMessage ? 'text-accent' : 'text-text',
)
</script>

<template>
  <div
    v-if="visibleLabel"
    class="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-black/30"
    role="status"
    aria-live="polite"
  >
    <div
      class="rounded-xl border border-border bg-surface-raised px-6 py-4 text-sm font-medium shadow-2xl"
      :class="tone"
    >
      {{ visibleLabel }}
    </div>
  </div>
</template>
