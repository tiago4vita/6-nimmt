<script setup lang="ts">
import { computed } from 'vue'
import { Loader2, WifiOff } from 'lucide-vue-next'

export type ConnectionStatus =
  | 'idle'
  | 'reconnecting'
  | 'submitting'
  | 'syncing'

const props = defineProps<{
  status?: ConnectionStatus
  isReconnecting?: boolean
  isSlowSubmit?: boolean
  isSyncing?: boolean
}>()

const resolvedStatus = computed<ConnectionStatus>(() => {
  if (props.status && props.status !== 'idle') {
    return props.status
  }
  if (props.isReconnecting) {
    return 'reconnecting'
  }
  if (props.isSyncing) {
    return 'syncing'
  }
  if (props.isSlowSubmit) {
    return 'submitting'
  }
  return 'idle'
})

const message = computed(() => {
  switch (resolvedStatus.value) {
    case 'reconnecting':
      return 'Reconnecting\u2026'
    case 'syncing':
      return 'Syncing game state\u2026'
    case 'submitting':
      return 'Still submitting\u2026'
    default:
      return null
  }
})

const icon = computed(() =>
  resolvedStatus.value === 'reconnecting' ? WifiOff : Loader2,
)

const spin = computed(() => resolvedStatus.value !== 'reconnecting')
</script>

<template>
  <div
    v-if="message"
    class="mb-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-surface-raised px-4 py-3 text-sm text-accent"
    role="status"
    aria-live="polite"
  >
    <component
      :is="icon"
      class="size-4 shrink-0"
      :class="spin ? 'motion-safe:animate-spin' : ''"
      aria-hidden="true"
    />
    {{ message }}
  </div>
</template>
