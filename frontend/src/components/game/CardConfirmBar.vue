<script setup lang="ts">
import type { Card } from '@/graphql/types'
import { useSfx } from '@/composables/useSfx'

defineProps<{
  card: Card | null
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { play } = useSfx()

function onConfirm(): void {
  play('ui.click')
  emit('confirm')
}

function onCancel(): void {
  play('ui.click')
  emit('cancel')
}
</script>

<template>
  <div
    v-if="card"
    class="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-accent/35 bg-surface-raised/95 px-4 py-2.5 shadow-md backdrop-blur-sm"
    role="region"
    aria-label="Confirm your card"
  >
    <button
      type="button"
      class="btn btn-primary"
      :disabled="isSubmitting"
      :aria-pressed="true"
      @click="onConfirm"
    >
      <span v-if="isSubmitting">Playing…</span>
      <span v-else>Play card {{ card.value }}</span>
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      :disabled="isSubmitting"
      @click="onCancel"
    >
      Cancel
    </button>
  </div>
</template>
