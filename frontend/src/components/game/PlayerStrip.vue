<script setup lang="ts">
import { computed } from 'vue'
import { Check, Crown, WifiOff } from 'lucide-vue-next'
import type { GamePhase, PlayerPublic } from '@/graphql/types'

const props = defineProps<{
  players: PlayerPublic[]
  myPlayerId: string | null
  phase?: GamePhase | null
}>()

const isSubmitPhase = computed(() => props.phase === 'SUBMIT')

function stateFor(player: PlayerPublic): {
  border: string
  ring: string
  label: string
} {
  if (!player.isConnected) {
    return {
      border: 'border-l-4 border-border opacity-60',
      ring: '',
      label: 'Away',
    }
  }

  if (player.hasSubmitted) {
    return {
      border: 'border-l-4 border-success',
      ring: '',
      label: 'Submitted',
    }
  }

  if (isSubmitPhase.value && player.id === props.myPlayerId) {
    return {
      border: 'border-l-4 border-border',
      ring: 'ring-2 ring-accent/60 motion-safe:animate-pulse',
      label: 'Your turn',
    }
  }

  return {
    border: 'border-l-4 border-border',
    ring: '',
    label: isSubmitPhase.value ? 'Waiting' : '',
  }
}
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="player in players"
      :key="player.id"
      class="rounded-md border border-border bg-surface-raised px-3 py-2 transition"
      :class="[stateFor(player).border, stateFor(player).ring]"
      :aria-label="`${player.displayName} \u2014 ${stateFor(player).label}`"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="flex min-w-0 items-center gap-1 text-sm text-text">
          <span class="truncate">{{ player.displayName }}</span>
          <Crown
            v-if="player.isHost"
            class="size-3 shrink-0 text-accent"
            aria-label="Host"
          />
          <span v-if="player.id === myPlayerId" class="text-muted">(you)</span>
        </span>
        <span class="flex items-center gap-1 text-xs">
          <Check
            v-if="player.hasSubmitted && player.isConnected"
            class="size-4 text-success"
            aria-hidden="true"
          />
          <WifiOff
            v-else-if="!player.isConnected"
            class="size-3.5 text-muted"
            aria-hidden="true"
          />
          <span
            v-if="stateFor(player).label"
            class="uppercase tracking-wide"
            :class="
              player.hasSubmitted
                ? 'text-success'
                : !player.isConnected
                  ? 'text-muted'
                  : isSubmitPhase && player.id === myPlayerId
                    ? 'text-accent'
                    : 'text-muted'
            "
          >
            {{ stateFor(player).label }}
          </span>
        </span>
      </div>
      <div class="mt-1 text-xs text-muted">
        {{ player.bonesTotal }} bones · {{ player.cardsInHand }} in hand
      </div>
    </div>
  </div>
</template>
