<script setup lang="ts">
import { computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import type { GameFinishReason, PlayerPublic } from '@/graphql/types'
import { useSfx } from '@/composables/useSfx'

const props = defineProps<{
  open: boolean
  players: PlayerPublic[]
  winnerIds: string[] | null
  finishReason?: GameFinishReason | null
  forfeitedPlayerIds?: string[] | null
  isRematching?: boolean
  isLeaving?: boolean
}>()

const emit = defineEmits<{
  rematch: []
  leave: []
}>()

const { play } = useSfx()

function onRematch(): void {
  play('ui.click')
  emit('rematch')
}

function onLeave(): void {
  play('ui.click')
  emit('leave')
}

interface RankedPlayer {
  player: PlayerPublic
  rank: number
  isWinner: boolean
}

const winners = computed(() =>
  props.players.filter((player) => props.winnerIds?.includes(player.id)),
)

const forfeitedPlayers = computed(() =>
  props.players.filter((player) =>
    props.forfeitedPlayerIds?.includes(player.id),
  ),
)

const isWalkover = computed(
  () =>
    props.finishReason === 'WALKOVER_LEAVE' ||
    props.finishReason === 'WALKOVER_AFK',
)

const isTie = computed(
  () => !isWalkover.value && winners.value.length > 1,
)

const heading = computed(() => {
  if (isWalkover.value) {
    return 'Walkover'
  }
  if (isTie.value) {
    return 'Shared victory'
  }
  return 'Final scores'
})

const subtitle = computed(() => {
  const winnerNames = winners.value.map((player) => player.displayName)
  const winnerLabel =
    winnerNames.length === 1
      ? winnerNames[0]
      : winnerNames.join(' & ')

  if (props.finishReason === 'WALKOVER_LEAVE') {
    const leaver = forfeitedPlayers.value[0]?.displayName ?? 'Opponent'
    return `${leaver} left the game — ${winnerLabel} wins by W.O.`
  }

  if (props.finishReason === 'WALKOVER_AFK') {
    const absent = forfeitedPlayers.value[0]?.displayName ?? 'Opponent'
    return `${absent} was away for 3 rounds — ${winnerLabel} wins by W.O.`
  }

  if (isTie.value) {
    return `Tie at ${winners.value[0]?.bonesTotal ?? 0} bones — ${winnerLabel}`
  }

  if (winners.value.length === 1) {
    return `Winner: ${winnerLabel}`
  }

  return null
})

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

function winnerHighlightClass(isWinner: boolean): string {
  if (!isWinner) {
    return 'border-border bg-surface'
  }
  if (isTie.value) {
    return 'border-victory-gold/50 border-l-4 border-l-victory-gold bg-victory-gold/10'
  }
  return 'border-accent/50 border-l-4 border-l-accent bg-accent/10'
}

const headerAccentClass = computed(() =>
  isTie.value ? 'text-victory-gold' : 'text-accent',
)

const winnerIconClass = computed(() =>
  isTie.value ? 'text-victory-gold' : 'text-accent',
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
    <div
      class="w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl"
    >
      <div class="flex items-center gap-2" :class="headerAccentClass">
        <Trophy class="size-5" aria-hidden="true" />
        <h2 class="text-xl font-semibold text-text">
          {{ heading }}
        </h2>
      </div>

      <p v-if="subtitle" class="mt-2 text-sm text-muted">
        {{ subtitle }}
      </p>

      <ol class="mt-4 space-y-2">
        <li
          v-for="{ player, rank, isWinner } in rankedPlayers"
          :key="player.id"
          class="flex items-center justify-between rounded-md border px-3 py-2"
          :class="winnerHighlightClass(isWinner)"
        >
          <span class="flex items-center gap-2 text-sm text-text">
            <Trophy
              v-if="isWinner"
              class="size-4 shrink-0"
              :class="winnerIconClass"
              aria-hidden="true"
            />
            <span>#{{ rank }} {{ player.displayName }}</span>
            <span
              v-if="forfeitedPlayerIds?.includes(player.id)"
              class="text-[10px] uppercase tracking-wide text-danger"
            >
              W.O.
            </span>
          </span>
          <span class="text-sm font-medium tabular-nums text-text">
            <template v-if="isWalkover && !isWinner">—</template>
            <template v-else>{{ player.bonesTotal }} bones</template>
          </span>
        </li>
      </ol>

      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="isRematching || isLeaving"
          @click="onRematch"
        >
          {{ isRematching ? 'Returning…' : 'Rematch' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="isRematching || isLeaving"
          @click="onLeave"
        >
          {{ isLeaving ? 'Leaving…' : 'Exit room' }}
        </button>
      </div>
    </div>
  </div>
</template>
