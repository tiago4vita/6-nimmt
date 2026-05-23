<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next'

defineProps<{
  visible: boolean
}>()
</script>

<template>
  <div
    v-if="visible"
    class="mb-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-surface-raised px-4 py-3 text-sm text-accent"
    role="status"
    aria-live="polite"
  >
    <WifiOff class="size-4 shrink-0" aria-hidden="true" />
    Reconnecting…
  </div>
</template>
