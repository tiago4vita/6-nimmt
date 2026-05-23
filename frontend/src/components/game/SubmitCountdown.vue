<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { GamePhase } from '@/graphql/types'
import { useSubmitDeadline } from '@/composables/useSubmitDeadline'

const props = defineProps<{
  deadline: string | null
  phase: GamePhase | null
  size?: number
  strokeWidth?: number
}>()

const emit = defineEmits<{
  deadline: []
}>()

const size = computed(() => props.size ?? 56)
const strokeWidth = computed(() => props.strokeWidth ?? 5)
const radius = computed(() => size.value / 2 - strokeWidth.value)
const circumference = computed(() => 2 * Math.PI * radius.value)

const deadlineRef = computed(() => props.deadline)
const phaseRef = computed(() => props.phase)
const totalDurationMs = ref<number>(0)

watch(
  () => [props.deadline, props.phase] as const,
  ([nextDeadline, nextPhase]) => {
    if (nextPhase !== 'SUBMIT' || !nextDeadline) {
      totalDurationMs.value = 0
      return
    }
    const remaining = Date.parse(nextDeadline) - Date.now()
    if (remaining > 0) {
      totalDurationMs.value = remaining
    }
  },
  { immediate: true },
)

const { isActive, remainingMs, remainingSeconds } = useSubmitDeadline({
  deadline: deadlineRef,
  phase: phaseRef,
  onDeadline: () => emit('deadline'),
})

const progress = computed(() => {
  if (!totalDurationMs.value) {
    return 1
  }
  return Math.max(0, Math.min(1, remainingMs.value / totalDurationMs.value))
})

const strokeDashoffset = computed(
  () => circumference.value * (1 - progress.value),
)

const colorClass = computed(() =>
  remainingSeconds.value <= 10 ? 'text-danger' : 'text-accent',
)

const label = computed(() => {
  const total = Math.max(0, remainingSeconds.value)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
})
</script>

<template>
  <div
    v-if="isActive"
    class="relative inline-flex items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="timer"
    :aria-label="`Time remaining ${label}`"
    aria-live="off"
  >
    <svg
      :width="size"
      :height="size"
      :viewBox="`0 0 ${size} ${size}`"
      class="-rotate-90 transition-colors"
      :class="colorClass"
      aria-hidden="true"
    >
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="currentColor"
        :stroke-width="strokeWidth"
        stroke-opacity="0.15"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="currentColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="strokeDashoffset"
        class="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-200"
      />
    </svg>
    <span
      class="absolute text-[11px] font-medium tabular-nums"
      :class="colorClass"
    >
      {{ label }}
    </span>
  </div>
</template>
