<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import type { Card, Row } from '@/graphql/types'

defineProps<{
  rows: Row[]
  myHand: Card[]
  selectedCardId: string | null
  submittedCardId: string | null
  handDisabled: boolean
  highlightedRowIndex: number | null
}>()

defineEmits<{
  select: [cardId: string]
}>()
</script>

<template>
  <TresCanvas
    class="h-full w-full rounded-xl"
    clear-color="#fafafa"
  >
    <TresPerspectiveCamera :position="[0, 9, 14]" :look-at="[0, 0, 0]" />
    <TresAmbientLight :intensity="0.85" />
    <TresDirectionalLight :position="[5, 10, 7]" :intensity="0.55" />
  </TresCanvas>
</template>
