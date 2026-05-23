<script setup lang="ts">
import { computed } from 'vue'
import CardTile from '@/components/game/CardTile.vue'
import type { Card } from '@/graphql/types'

const props = defineProps<{
  cards: Card[]
  selectedCardId?: string | null
  optimisticSelectedId?: string | null
  submittedCardId?: string | null
  disabled?: boolean
  isSubmitting?: boolean
}>()

const emit = defineEmits<{
  select: [cardId: string]
}>()

const playableCards = computed(() =>
  props.cards.filter((card) => card.id !== props.submittedCardId),
)

function isSelected(cardId: string): boolean {
  return (
    props.selectedCardId === cardId || props.optimisticSelectedId === cardId
  )
}
</script>

<template>
  <div class="flex flex-wrap justify-center gap-2">
    <button
      v-for="(card, index) in playableCards"
      :key="card.id"
      type="button"
      class="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      :aria-pressed="isSelected(card.id)"
      :aria-disabled="disabled"
      :disabled="disabled"
      @click="emit('select', card.id)"
    >
      <CardTile
        :card="card"
        :selected="isSelected(card.id)"
        :disabled="disabled"
      />
      <span class="sr-only">Card {{ card.value }}, position {{ index + 1 }}</span>
      <span
        v-if="isSubmitting && optimisticSelectedId === card.id"
        class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-[10px] font-medium uppercase tracking-wide text-white"
        role="status"
      >
        Submitting…
      </span>
    </button>
  </div>
</template>
