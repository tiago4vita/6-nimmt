<script setup lang="ts">
import type { BonePopEntry } from '@/composables/useBonePop'

defineProps<{
  pops: BonePopEntry[]
}>()
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
    aria-live="polite"
    aria-atomic="false"
  >
    <div
      v-for="pop in pops"
      :key="pop.id"
      class="bone-pop-layer absolute flex justify-center"
      :style="{ transform: `translateY(${-pop.stackIndex * 3.25}rem)` }"
    >
      <p
        class="bone-pop motion-safe:animate-bone-pop tabular-nums"
        :class="pop.isYou ? 'bone-pop--you' : 'bone-pop--opponent'"
        role="status"
      >
        +{{ pop.bones }}
        <span aria-hidden="true">🦴</span>
      </p>
    </div>
  </div>
</template>
