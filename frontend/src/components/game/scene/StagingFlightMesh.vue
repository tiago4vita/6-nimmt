<script setup lang="ts">
import { markRaw, onBeforeUnmount, shallowRef } from 'vue'

import {
  clearStagingFlight,
  registerStagingFlightFaceUpdater,
  registerStagingFlightGroup,
} from '@/lib/scene/stagingFlightRuntime'
import { createStagingCardGroup } from '@/lib/scene/stagingCardGroup'

const PLACEHOLDER_CARD = { id: '__flight__', value: 1, bones: 1 }

const stagingCard = createStagingCardGroup(PLACEHOLDER_CARD)
const root = shallowRef(markRaw(stagingCard.group))

stagingCard.group.visible = false
registerStagingFlightGroup(stagingCard.group)
registerStagingFlightFaceUpdater((value, bones) => {
  stagingCard.setCardFace(value, bones)
})

onBeforeUnmount(() => {
  registerStagingFlightFaceUpdater(null)
  registerStagingFlightGroup(null)
  clearStagingFlight()
  stagingCard.dispose()
})
</script>

<template>
  <primitive :object="root" />
</template>
