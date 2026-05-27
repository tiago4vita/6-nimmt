import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useLoop } from '@tresjs/core'

import { HAND_MOTION } from '@/lib/scene/constants'
import {
  jiggleSeedFromId,
  sampleCardJiggle,
  ZERO_JIGGLE,
  type JiggleSample,
} from '@/lib/scene/handJiggle'

export function useCardJiggle(options: {
  cardId: string
  hovered: Ref<boolean>
  selected: Ref<boolean>
  enabled: Ref<boolean>
  onUpdate: () => void
}): { jiggle: JiggleSample; triggerJiggle: (intensity?: number) => void } {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const jiggle: JiggleSample = { ...ZERO_JIGGLE }
  const jiggleStart = ref<number | null>(null)
  const jiggleIntensity = ref(1)
  const seed = jiggleSeedFromId(options.cardId)

  function triggerJiggle(intensity = 1): void {
    if (!options.enabled.value || reducedMotion.value) {
      return
    }
    jiggleIntensity.value = intensity
    jiggleStart.value = performance.now()
  }

  watch(
    () => options.selected.value,
    (selected, wasSelected) => {
      if (selected && !wasSelected) {
        triggerJiggle(HAND_MOTION.selectedJiggleIntensity)
      }
    },
  )

  const { onBeforeRender } = useLoop()

  onBeforeRender(() => {
    if (jiggleStart.value === null) {
      return
    }

    const elapsed = performance.now() - jiggleStart.value
    Object.assign(
      jiggle,
      sampleCardJiggle(
        elapsed,
        HAND_MOTION.jiggleDurationMs,
        seed,
        jiggleIntensity.value,
      ),
    )

    if (elapsed >= HAND_MOTION.jiggleDurationMs) {
      jiggleStart.value = null
      Object.assign(jiggle, ZERO_JIGGLE)
    }

    options.onUpdate()
  })

  onBeforeUnmount(() => {
    jiggleStart.value = null
    Object.assign(jiggle, ZERO_JIGGLE)
  })

  return { jiggle, triggerJiggle }
}
