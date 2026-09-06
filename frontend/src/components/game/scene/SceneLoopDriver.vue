<script setup lang="ts">
import { useLoop } from '@tresjs/core'

import { updateCardLiftTweens } from '@/composables/useCardLift'

const { onBeforeRender } = useLoop()
onBeforeRender(() => {
  updateCardLiftTweens()
})
</script>

<template>
  <TresGroup />
</template>
