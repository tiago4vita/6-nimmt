<script setup lang="ts">
import CardTile from '@/components/game/CardTile.vue'
import type { PlayerPublic, ResolvedPlay } from '@/graphql/types'

defineProps<{
  plays: ResolvedPlay[]
  players: PlayerPublic[]
}>()

function playerName(players: PlayerPublic[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.displayName ?? 'Player'
}
</script>

<template>
  <div v-if="plays.length" class="rounded-lg border border-border bg-surface-raised p-4">
    <h3 class="mb-3 text-sm font-medium text-text">Last resolve</h3>
    <ul class="space-y-2">
      <li
        v-for="(play, index) in plays"
        :key="`${play.playerId}-${play.card.id}-${index}`"
        class="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 resolve-feed-item"
        :style="{ animationDelay: `${index * 80}ms` }"
      >
        <div class="min-w-0">
          <div class="truncate text-sm text-text">{{ playerName(players, play.playerId) }}</div>
          <div class="text-xs text-muted">
            Row {{ play.rowIndex !== null ? play.rowIndex + 1 : '—' }}
            · {{ play.bonesTaken }} bones taken
          </div>
        </div>
        <CardTile :card="play.card" size="sm" />
      </li>
    </ul>
  </div>
</template>
