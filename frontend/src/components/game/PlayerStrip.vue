<script setup lang="ts">
import type { PlayerPublic } from '@/graphql/types'

defineProps<{
  players: PlayerPublic[]
  myPlayerId: string | null
}>()
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="player in players"
      :key="player.id"
      class="rounded-md border border-border bg-surface-raised px-3 py-2"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm text-text">
          {{ player.displayName }}
          <span v-if="player.id === myPlayerId" class="text-muted">(you)</span>
        </span>
        <span
          class="size-2 rounded-full"
          :class="player.hasSubmitted ? 'bg-success' : 'bg-border'"
          :title="player.hasSubmitted ? 'Submitted' : 'Waiting'"
        />
      </div>
      <div class="mt-1 text-xs text-muted">
        {{ player.bonesTotal }} bones · {{ player.cardsInHand }} in hand
      </div>
    </div>
  </div>
</template>
