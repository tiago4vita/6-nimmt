<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/graphql/types'
import { cardTileTierClass } from '@/lib/cardColors'

const props = defineProps<{
  card: Card
  selected?: boolean
  submitted?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}>()

const tierClass = computed(() => cardTileTierClass(props.card.bones))
const sizeClass = computed(() => (props.size === 'sm' ? 'h-14 w-10 text-sm' : 'h-20 w-14 text-lg'))
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center rounded-md font-bold text-card-face-text shadow-md transition"
    :class="[
      tierClass,
      sizeClass,
      selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : '',
      submitted ? 'ring-2 ring-success/70 ring-offset-2 ring-offset-surface' : '',
      disabled ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5',
    ]"
  >
    <span class="font-bold">{{ card.value }}</span>
    <span class="absolute bottom-1 text-[10px] font-normal text-card-face-text">{{ card.bones }}🦴</span>
  </div>
</template>
