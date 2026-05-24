<script setup lang="ts">
import { Crown } from 'lucide-vue-next'
import type { PlayerPublic } from '@/graphql/types'

defineProps<{
  players: PlayerPublic[]
  myPlayerId: string | null
}>()
</script>

<template>
  <ul class="space-y-2">
    <li
      v-for="player in players"
      :key="player.id"
      class="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
    >
      <div class="flex items-center gap-2">
        <span
          class="size-2 rounded-full"
          :class="player.isConnected ? 'bg-success' : 'bg-muted'"
          :title="player.isConnected ? 'Connected' : 'Away'"
        />
        <span class="text-sm text-text">
          {{ player.displayName }}
          <span v-if="player.id === myPlayerId" class="text-muted">(you)</span>
        </span>
      </div>
      <Crown
        v-if="player.isHost"
        class="size-4 text-accent"
        aria-label="Host"
      />
    </li>
  </ul>
</template>
