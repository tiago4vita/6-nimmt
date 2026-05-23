<script setup lang="ts">
import GameRow from '@/components/game/GameRow.vue'
import type { Row } from '@/graphql/types'

defineProps<{
  rows: Row[]
  highlightedRowIndex?: number | null
}>()
</script>

<template>
  <div class="rounded-xl border border-border bg-felt p-4">
    <div class="grid gap-3">
      <GameRow
        v-for="row in rows"
        :key="row.index"
        :row="row"
        :highlighted="highlightedRowIndex === row.index"
      />
    </div>
  </div>
</template>
