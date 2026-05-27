import { onBeforeUnmount, watch, type Ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Easing, Group, Tween } from '@tweenjs/tween.js'

import { HAND_MOTION } from '@/lib/scene/constants'

export type CardLiftTier = 'rest' | 'hover' | 'selected'

export interface CardLiftTransform {
  offsetY: number
  offsetZ: number
  scale: number
  ringOpacity: number
}

/** Selected pop forward on Z; hover uses jiggle only (no sustained lift). */
export const CARD_LIFT: Record<CardLiftTier, CardLiftTransform> = {
  rest: { offsetY: 0, offsetZ: 0, scale: 1, ringOpacity: 0 },
  hover: { offsetY: 0, offsetZ: 0, scale: 1, ringOpacity: 0 },
  selected: {
    offsetY: 0,
    offsetZ: HAND_MOTION.selectedPopZ,
    scale: 1,
    ringOpacity: 0,
  },
}

export const CARD_LIFT_DURATION_MS = {
  hover: 150,
  select: HAND_MOTION.selectedPopDurationMs,
} as const

/** Shared tween group — updated from the TresJS render loop via `updateCardLiftTweens`. */
export const cardLiftTweenGroup = new Group()

export function updateCardLiftTweens(time = performance.now()): void {
  cardLiftTweenGroup.update(time)
}

function liftDurationForTier(tier: CardLiftTier): number {
  return tier === 'selected' ? CARD_LIFT_DURATION_MS.select : CARD_LIFT_DURATION_MS.hover
}

export function useCardLift(options: {
  tier: Ref<CardLiftTier>
  enabled: Ref<boolean>
  onUpdate: () => void
}): { lift: CardLiftTransform } {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const lift: CardLiftTransform = {
    offsetY: 0,
    offsetZ: 0,
    scale: 1,
    ringOpacity: 0,
  }

  let activeTween: Tween<CardLiftTransform> | null = null

  function stopActiveTween(): void {
    if (!activeTween) {
      return
    }
    activeTween.stop()
    activeTween.remove()
    activeTween = null
  }

  function snapToTier(tier: CardLiftTier): void {
    Object.assign(lift, CARD_LIFT[tier])
    options.onUpdate()
  }

  function animateToTier(tier: CardLiftTier): void {
    stopActiveTween()

    const target = CARD_LIFT[tier]

    if (reducedMotion.value) {
      snapToTier(tier)
      return
    }

    activeTween = new Tween(lift)
      .to(
        {
          offsetY: target.offsetY,
          offsetZ: target.offsetZ,
          scale: target.scale,
          ringOpacity: target.ringOpacity,
        },
        liftDurationForTier(tier),
      )
      .easing(Easing.Quadratic.Out)
      .onUpdate(options.onUpdate)

    cardLiftTweenGroup.add(activeTween)
    activeTween.start()
  }

  watch(
    [options.tier, options.enabled, reducedMotion],
    ([tier, enabled]) => {
      if (!enabled) {
        stopActiveTween()
        snapToTier('rest')
        return
      }
      animateToTier(tier)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    stopActiveTween()
  })

  return { lift }
}
