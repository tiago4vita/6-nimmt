<script setup lang="ts">
import { ContactShadows } from '@tresjs/cientos'
import { TresCanvas } from '@tresjs/core'

import type { Card, Row } from '@/graphql/types'
import {
  LIGHTING,
  SCENE,
  TABLE,
  TABLE_HALF_DEPTH,
  TABLE_HALF_WIDTH,
  CONTACT_SHADOW_SCALE,
} from '@/lib/scene/constants'
import SceneCamera from '@/components/game/scene/SceneCamera.vue'
import TableSurface from '@/components/game/scene/TableSurface.vue'

defineProps<{
  rows: Row[]
  myHand: Card[]
  selectedCardId: string | null
  submittedCardId: string | null
  handDisabled: boolean
  highlightedRowIndex: number | null
}>()

defineEmits<{
  select: [cardId: string]
}>()
</script>

<template>
  <TresCanvas
    class="scene-canvas h-full w-full rounded-xl"
    :clear-color="SCENE.clearColor"
    shadows
  >
    <SceneCamera />

    <TresAmbientLight
      :intensity="LIGHTING.ambientIntensity"
      :color="LIGHTING.ambientColor"
    />
    <TresDirectionalLight
      cast-shadow
      :position="LIGHTING.directionalPosition"
      :intensity="LIGHTING.directionalIntensity"
      :color="LIGHTING.directionalColor"
      :shadow-mapSize-width="2048"
      :shadow-mapSize-height="2048"
      :shadow-camera-near="0.5"
      :shadow-camera-far="40"
      :shadow-camera-left="-TABLE_HALF_WIDTH"
      :shadow-camera-right="TABLE_HALF_WIDTH"
      :shadow-camera-top="TABLE_HALF_DEPTH"
      :shadow-camera-bottom="-TABLE_HALF_DEPTH"
    />
    <TresHemisphereLight
      :intensity="LIGHTING.hemisphereIntensity"
      :color="LIGHTING.hemisphereSky"
      :ground-color="LIGHTING.hemisphereGround"
    />

    <TableSurface />

    <ContactShadows
      :position-y="TABLE.y + 0.002"
      :opacity="0.28"
      :blur="2.8"
      color="#6b6560"
      :scale="CONTACT_SHADOW_SCALE"
      :resolution="512"
      :smooth="true"
    />
  </TresCanvas>
</template>

<style scoped>
.scene-canvas {
  display: block;
  min-height: 0;
  overflow: hidden;
}
</style>
