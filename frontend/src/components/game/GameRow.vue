<script setup lang="ts">
import CardTile from '@/components/game/CardTile.vue'
import type { Row } from '@/graphql/types'

defineProps<{
  row: Row
  highlighted?: boolean
}>()
</script>

<template>
  <div
    class="rounded-lg border border-border bg-surface-raised/60 p-3 transition"
    :class="highlighted ? 'ring-2 ring-accent/50' : ''"
  >
    <div class="mb-2 text-xs uppercase tracking-wide text-muted">Row {{ row.index + 1 }}</div>
    <div class="flex flex-wrap gap-2">
      <CardTile v-for="card in row.cards" :key="card.id" :card="card" size="sm" />
      <div
        v-if="row.cards.length === 0"
        class="flex h-14 w-full items-center justify-center rounded-md border border-dashed border-border text-xs text-muted"
      >
        Empty
      </div>
    </div>
  </div>
</template>
