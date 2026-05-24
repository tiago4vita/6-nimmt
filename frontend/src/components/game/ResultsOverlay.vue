<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import type { PlayerPublic } from '@/graphql/types'

const props = defineProps<{
  open: boolean
  players: PlayerPublic[]
  winnerIds: string[] | null
  isRematching?: boolean
  isLeaving?: boolean
}>()

const emit = defineEmits<{
  rematch: []
  leave: []
}>()

interface RankedPlayer {
  player: PlayerPublic
  rank: number
  isWinner: boolean
}

const winners = computed(() =>
  props.players.filter((player) => props.winnerIds?.includes(player.id)),
)

const isTie = computed(() => winners.value.length > 1)

const rankedPlayers = computed((): RankedPlayer[] => {
  const sorted = [...props.players].sort(
    (a, b) => a.bonesTotal - b.bonesTotal,
  )
  const ranked: RankedPlayer[] = []
  let rank = 0
  let previousBones: number | null = null

  for (let index = 0; index < sorted.length; index += 1) {
    const player = sorted[index]
    if (previousBones === null || player.bonesTotal !== previousBones) {
      rank = index + 1
      previousBones = player.bonesTotal
    }
    ranked.push({
      player,
      rank,
      isWinner: props.winnerIds?.includes(player.id) ?? false,
    })
  }

  return ranked
})
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Game results"
  >
    <div
      class="w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl"
    >
      <div class="flex items-center gap-2 text-accent">
        <Trophy class="size-5" aria-hidden="true" />
        <h2 class="text-xl font-semibold text-text">
          {{ isTie ? 'Shared victory' : 'Final scores' }}
        </h2>
      </div>

      <p v-if="winners.length" class="mt-2 text-sm text-muted">
        <template v-if="isTie">
          Tie at {{ winners[0]?.bonesTotal ?? 0 }} bones —
          {{ winners.map((player) => player.displayName).join(' & ') }}
        </template>
        <template v-else>
          Winner: {{ winners[0]?.displayName }}
        </template>
      </p>

      <ol class="mt-4 space-y-2">
        <li
          v-for="{ player, rank, isWinner } in rankedPlayers"
          :key="player.id"
          class="flex items-center justify-between rounded-md border px-3 py-2"
          :class="
            isWinner
              ? 'border-accent/50 border-l-4 border-l-accent bg-accent/10'
              : 'border-border bg-surface'
          "
        >
          <span class="flex items-center gap-2 text-sm text-text">
            <Trophy
              v-if="isWinner"
              class="size-4 shrink-0 text-accent"
              aria-hidden="true"
            />
            <span>#{{ rank }} {{ player.displayName }}</span>
          </span>
          <span class="text-sm font-medium tabular-nums text-text">
            {{ player.bonesTotal }} bones
          </span>
        </li>
      </ol>

      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="isRematching || isLeaving"
          @click="emit('rematch')"
        >
          {{ isRematching ? 'Returning…' : 'Rematch' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="isRematching || isLeaving"
          @click="emit('leave')"
        >
          {{ isLeaving ? 'Leaving…' : 'Exit room' }}
        </button>
      </div>
    </div>
  </div>
</template>
