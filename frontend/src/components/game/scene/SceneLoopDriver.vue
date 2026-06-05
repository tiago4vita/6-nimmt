<script setup lang="ts">
import { useLoop } from '@tresjs/core'

import { updateCardLiftTweens } from '@/composables/useCardLift'
import { updateBoneTierEffects } from '@/lib/scene/boneTierEffects'

const { onBeforeRender } = useLoop()
onBeforeRender(({ elapsed }) => {
  updateCardLiftTweens()
  updateBoneTierEffects(elapsed * 1000)
})
</script>

<template>
  <TresGroup />
</template>
