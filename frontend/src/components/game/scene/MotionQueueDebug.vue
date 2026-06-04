<script setup lang="ts">
import { computed } from 'vue'

import type { CardMotionQueueDebug } from '@/composables/useCardMotionQueue'
import { SCENE_DEBUG } from '@/lib/scene/constants'

const props = defineProps<{
  debug: CardMotionQueueDebug
}>()

const queueLength = computed(() => props.debug.queueLength.value)
const currentStepIndex = computed(() => props.debug.currentStepIndex.value)
const currentStep = computed(() => props.debug.currentStep.value)
const isAnimating = computed(() => props.debug.isAnimating.value)
</script>

<template>
  <div
    v-if="SCENE_DEBUG.showAxisIndicator"
    class="pointer-events-none absolute left-2 top-2 z-20 rounded-md border border-border/60 bg-surface-raised/90 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-muted shadow-sm backdrop-blur-sm"
    aria-hidden="true"
  >
    <p class="font-semibold uppercase tracking-wide text-text">Motion queue</p>
    <p>q: {{ queueLength }} · step: {{ currentStepIndex }}</p>
    <p v-if="currentStep">
      {{ currentStep.type }}
      <span v-if="currentStep.rowIndex !== undefined">
        · row {{ currentStep.rowIndex }}
      </span>
    </p>
    <p v-else class="text-muted">idle</p>
    <p v-if="isAnimating" class="text-accent">animating</p>
  </div>
</template>
