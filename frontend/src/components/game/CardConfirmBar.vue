<script setup lang="ts">
import CardTile from '@/components/game/CardTile.vue'
import type { Card } from '@/graphql/types'

defineProps<{
  card: Card | null
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div
    v-if="card"
    class="flex flex-wrap items-center justify-center gap-3 rounded-md border border-accent/30 bg-surface px-4 py-3"
    role="region"
    aria-label="Confirm your card"
  >
    <CardTile :card="card" selected size="sm" />
    <button
      type="button"
      class="btn btn-primary"
      :disabled="isSubmitting"
      @click="emit('confirm')"
    >
      <span v-if="isSubmitting">Submitting…</span>
      <span v-else>Play card {{ card.value }}</span>
    </button>
    <button
      type="button"
      class="btn btn-secondary"
      :disabled="isSubmitting"
      @click="emit('cancel')"
    >
      Cancel
    </button>
  </div>
</template>
