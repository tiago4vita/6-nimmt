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
}>()

const emit = defineEmits<{
  submit: [cardId: string]
}>()

const playableCards = computed(() =>
  props.cards.filter((card) => card.id !== props.submittedCardId),
)
</script>

<template>
  <div class="flex flex-wrap justify-center gap-2">
    <button
      v-for="(card, index) in playableCards"
      :key="card.id"
      type="button"
      class="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      :aria-pressed="selectedCardId === card.id || optimisticSelectedId === card.id"
      :aria-disabled="disabled"
      :disabled="disabled"
      @click="emit('submit', card.id)"
    >
      <CardTile
        :card="card"
        :selected="selectedCardId === card.id || optimisticSelectedId === card.id"
        :disabled="disabled"
      />
      <span class="sr-only">Card {{ card.value }}, position {{ index + 1 }}</span>
    </button>
  </div>
</template>
