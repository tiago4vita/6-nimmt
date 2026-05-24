import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

import type { GamePhase } from '@/graphql/types'

export interface UseSubmitDeadlineOptions {
  deadline: Ref<string | null>
  phase: Ref<GamePhase | null>
  onDeadline?: () => void
  tickMs?: number
}

const DEFAULT_TICK_MS = 250

export function useSubmitDeadline({
  deadline,
  phase,
  onDeadline,
  tickMs = DEFAULT_TICK_MS,
}: UseSubmitDeadlineOptions) {
  const now = ref(Date.now())
  let intervalId: number | null = null
  let deadlineFiredFor: string | null = null

  const deadlineMs = computed<number | null>(() => {
    const iso = deadline.value
    if (!iso) {
      return null
    }
    const parsed = Date.parse(iso)
    return Number.isNaN(parsed) ? null : parsed
  })

  const isActive = computed(
    () => phase.value === 'SUBMIT' && deadlineMs.value !== null,
  )

  const remainingMs = computed(() => {
    if (deadlineMs.value === null) {
      return 0
    }
    return Math.max(0, deadlineMs.value - now.value)
  })

  const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000))

  function start(): void {
    stop()
    intervalId = window.setInterval(() => {
      now.value = Date.now()
    }, tickMs)
  }

  function stop(): void {
    if (intervalId !== null) {
      window.clearInterval(intervalId)
      intervalId = null
    }
  }

  watch(
    isActive,
    (active) => {
      if (active) {
        now.value = Date.now()
        start()
      } else {
        stop()
        deadlineFiredFor = null
      }
    },
    { immediate: true },
  )

  watch(deadline, (next) => {
    if (next !== deadlineFiredFor) {
      deadlineFiredFor = null
    }
  })

  watch(remainingMs, (ms) => {
    if (
      ms === 0 &&
      isActive.value &&
      deadline.value !== null &&
      deadline.value !== deadlineFiredFor &&
      onDeadline
    ) {
      deadlineFiredFor = deadline.value
      onDeadline()
    }
  })

  onBeforeUnmount(stop)

  return {
    isActive,
    remainingMs,
    remainingSeconds,
  }
}
