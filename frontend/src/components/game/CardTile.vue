<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/graphql/types'
import { cardTileGradientClass } from '@/lib/cardColors'

const props = defineProps<{
  card: Card
  selected?: boolean
  submitted?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}>()

const hueClass = computed(() => cardTileGradientClass(props.card.value))
const sizeClass = computed(() => (props.size === 'sm' ? 'h-14 w-10 text-sm' : 'h-20 w-14 text-lg'))
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center rounded-md bg-gradient-to-br font-semibold text-[var(--color-card-face-text)] shadow-md transition"
    :class="[
      hueClass,
      sizeClass,
      selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : '',
      submitted ? 'ring-2 ring-success/70 ring-offset-2 ring-offset-surface' : '',
      disabled ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5',
    ]"
  >
    <span>{{ card.value }}</span>
    <span class="absolute bottom-1 text-[10px] opacity-80">{{ card.bones }}🦴</span>
  </div>
</template>
