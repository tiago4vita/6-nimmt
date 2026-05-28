<script setup lang="ts">
import { markRaw, onBeforeUnmount, shallowRef } from 'vue'

import {
  clearCardFlight,
  registerCardFlightFaceUpdater,
  registerCardFlightGroup,
} from '@/lib/scene/cardFlightRuntime'
import { createStagingCardGroup } from '@/lib/scene/stagingCardGroup'

const PLACEHOLDER_CARD = { id: '__flight__', value: 1, bones: 1 }

const flightCard = createStagingCardGroup(PLACEHOLDER_CARD)
const root = shallowRef(markRaw(flightCard.group))

flightCard.group.visible = false
registerCardFlightGroup(flightCard.group)
registerCardFlightFaceUpdater((value, bones, showBack) => {
  flightCard.setShowBack(showBack)
  if (!showBack) {
    flightCard.setCardFace(value, bones)
  }
  flightCard.setOpacity(1)
})

onBeforeUnmount(() => {
  registerCardFlightFaceUpdater(null)
  registerCardFlightGroup(null)
  clearCardFlight()
  flightCard.dispose()
})
</script>

<template>
  <primitive :object="root" />
</template>
