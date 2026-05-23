<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import type { PlayerPublic } from '@/graphql/types'

const props = defineProps<{
  open: boolean
  players: PlayerPublic[]
  winnerIds: string[] | null
}>()

const emit = defineEmits<{
  close: []
}>()

const winners = computed(() =>
  props.players.filter((player) => props.winnerIds?.includes(player.id)),
)

const sortedPlayers = computed(() =>
  [...props.players].sort((a, b) => a.bonesTotal - b.bonesTotal),
)
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Game results"
  >
    <div class="w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl">
      <div class="flex items-center gap-2 text-accent">
        <Trophy class="size-5" aria-hidden="true" />
        <h2 class="text-xl font-semibold text-text">Final scores</h2>
      </div>

      <p v-if="winners.length" class="mt-2 text-sm text-muted">
        Winner{{ winners.length > 1 ? 's' : '' }}:
        {{ winners.map((player) => player.displayName).join(', ') }}
      </p>

      <ol class="mt-4 space-y-2">
        <li
          v-for="(player, index) in sortedPlayers"
          :key="player.id"
          class="flex items-center justify-between rounded-md border px-3 py-2"
          :class="
            winnerIds?.includes(player.id)
              ? 'border-accent/50 bg-accent/10'
              : 'border-border bg-surface'
          "
        >
          <span class="text-sm text-text">
            #{{ index + 1 }} {{ player.displayName }}
          </span>
          <span class="text-sm font-medium text-text">{{ player.bonesTotal }} bones</span>
        </li>
      </ol>

      <div class="mt-6 flex justify-end gap-3">
        <RouterLink
          to="/"
          class="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:opacity-90"
          @click="emit('close')"
        >
          Back to home
        </RouterLink>
      </div>
    </div>
  </div>
</template>
