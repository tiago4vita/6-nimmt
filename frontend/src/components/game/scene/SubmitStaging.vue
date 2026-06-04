<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, shallowRef, watch } from 'vue'

import CardMesh from '@/components/game/scene/CardMesh.vue'
import type { Card } from '@/graphql/types'
import { createStagingCardGroup } from '@/lib/scene/stagingCardGroup'
import { stagingSlotTransform } from '@/lib/scene/stagingLayout'

const props = defineProps<{
  yourCard: Card | null
  opponentVisible: boolean
}>()

const emit = defineEmits<{
  'register-opponent-opacity': [setter: ((opacity: number) => void) | null]
}>()

const slot = computed(() => stagingSlotTransform())

const opponentStaging = createStagingCardGroup(
  { id: '__opponent_staged__', value: 0, bones: 0 },
  true,
)
const opponentRoot = shallowRef(markRaw(opponentStaging.group))

function applyOpponentSlotTransform(): void {
  const { position, rotation } = slot.value
  opponentStaging.group.position.set(...position)
  opponentStaging.group.rotation.set(...rotation)
}

applyOpponentSlotTransform()

watch(
  () => props.opponentVisible,
  (visible) => {
    if (visible) {
      applyOpponentSlotTransform()
      emit('register-opponent-opacity', (opacity) => {
        opponentStaging.setOpacity(opacity)
      })
      opponentStaging.setOpacity(0)
      return
    }

    emit('register-opponent-opacity', null)
    opponentStaging.setOpacity(0)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  emit('register-opponent-opacity', null)
  opponentStaging.dispose()
})
</script>

<template>
  <TresGroup>
    <CardMesh
      v-if="yourCard"
      :card="yourCard"
      :position="slot.position"
      :rotation="slot.rotation"
      orientation="staging"
      :render-order="20"
    />

    <primitive v-if="opponentVisible" :object="opponentRoot" />
  </TresGroup>
</template>
