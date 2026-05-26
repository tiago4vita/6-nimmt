<script setup lang="ts">
import { computed } from 'vue'

import CardMesh from '@/components/game/scene/CardMesh.vue'
import type { Card } from '@/graphql/types'
import { computeFanLayout } from '@/lib/scene/fanLayout'

const props = defineProps<{
  hand: Card[]
  selectedCardId: string | null
  submittedCardId: string | null
  disabled: boolean
}>()

const emit = defineEmits<{
  select: [cardId: string]
}>()

const playableHand = computed(() =>
  props.hand.filter((card) => card.id !== props.submittedCardId),
)

const fanSlots = computed(() => computeFanLayout(playableHand.value))

function isDimmed(cardId: string): boolean {
  if (!props.disabled) {
    return false
  }
  return props.selectedCardId !== cardId
}

function onSelect(cardId: string): void {
  if (props.disabled) {
    return
  }
  emit('select', cardId)
}
</script>

<template>
  <TresGroup>
    <CardMesh
      v-for="(slot, index) in fanSlots"
      :key="slot.card.id"
      :card="slot.card"
      :position="slot.position"
      :rotation="slot.rotation"
      :render-order="index + 1"
      orientation="hand"
      :dimmed="isDimmed(slot.card.id)"
      :selected="selectedCardId === slot.card.id"
      :interactive="!disabled"
      @select="onSelect"
    />
  </TresGroup>
</template>
