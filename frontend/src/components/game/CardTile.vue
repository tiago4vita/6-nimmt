<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/graphql/types'

const props = defineProps<{
  card: Card
  selected?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}>()

const hueClass = computed(() => {
  if (props.card.value <= 26) return 'from-indigo-500 to-violet-600'
  if (props.card.value <= 52) return 'from-teal-500 to-emerald-600'
  if (props.card.value <= 78) return 'from-amber-500 to-orange-600'
  return 'from-rose-500 to-red-600'
})

const sizeClass = computed(() => (props.size === 'sm' ? 'h-14 w-10 text-sm' : 'h-20 w-14 text-lg'))
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center rounded-md bg-gradient-to-br font-semibold text-white shadow-md transition"
    :class="[
      hueClass,
      sizeClass,
      selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : '',
      disabled ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-0.5',
    ]"
  >
    <span>{{ card.value }}</span>
    <span class="absolute bottom-1 text-[10px] opacity-80">{{ card.bones }}🦴</span>
  </div>
</template>
