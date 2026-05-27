<script setup lang="ts">
import { computed } from 'vue'
import { ContactShadows } from '@tresjs/cientos'
import { TresCanvas } from '@tresjs/core'

import type { Card, Row } from '@/graphql/types'
import {
  LIGHTING,
  playfieldCenter,
  PLAYFIELD_HALF_DEPTH,
  PLAYFIELD_HALF_WIDTH,
  SHADOW,
  TABLE,
} from '@/lib/scene/constants'
import { readSceneColors } from '@/lib/scene/tokens'
import SceneCamera from '@/components/game/scene/SceneCamera.vue'
import SceneAxisGizmo from '@/components/game/scene/SceneAxisGizmo.vue'
import SceneAxisLegend from '@/components/game/scene/SceneAxisLegend.vue'
import SceneLoopDriver from '@/components/game/scene/SceneLoopDriver.vue'
import HandFan from '@/components/game/scene/HandFan.vue'
import RowTrack from '@/components/game/scene/RowTrack.vue'
import StagingFlightMesh from '@/components/game/scene/StagingFlightMesh.vue'
import SubmitStaging from '@/components/game/scene/SubmitStaging.vue'

const props = defineProps<{
  rows: Row[]
  myHand: Card[]
  selectedCardId: string | null
  submittedCardId: string | null
  hiddenHandCardIds: string[]
  handDisabled: boolean
  handFrozen: boolean
  highlightedRowIndex: number | null
  stagedYourCard: Card | null
  opponentStagingVisible: boolean
}>()

const emit = defineEmits<{
  select: [cardId: string]
  'register-opponent-opacity': [setter: ((opacity: number) => void) | null]
}>()

const colors = computed(() => readSceneColors())
const [playfieldX, , playfieldZ] = playfieldCenter()
</script>

<template>
  <div class="scene-root relative h-full w-full">
    <TresCanvas
      class="scene-canvas h-full w-full"
      :clear-color="colors.clear"
      shadows
    >
      <SceneCamera />
      <SceneLoopDriver />
      <SceneAxisGizmo />

      <TresAmbientLight
        :intensity="LIGHTING.ambientIntensity"
        :color="colors.lightAmbient"
      />
      <TresDirectionalLight
        cast-shadow
        :position="LIGHTING.directionalPosition"
        :intensity="LIGHTING.directionalIntensity"
        :color="colors.lightDirectional"
        :shadow-mapSize-width="2048"
        :shadow-mapSize-height="2048"
        :shadow-camera-near="0.5"
        :shadow-camera-far="45"
        :shadow-camera-left="playfieldX - PLAYFIELD_HALF_WIDTH"
        :shadow-camera-right="playfieldX + PLAYFIELD_HALF_WIDTH"
        :shadow-camera-top="playfieldZ + PLAYFIELD_HALF_DEPTH"
        :shadow-camera-bottom="playfieldZ - PLAYFIELD_HALF_DEPTH"
      />
      <TresHemisphereLight
        :intensity="LIGHTING.hemisphereIntensity"
        :color="colors.lightHemisphereSky"
        :ground-color="colors.lightHemisphereGround"
      />

      <TresGroup :position="playfieldCenter()">
        <ContactShadows
          :position-y="TABLE.y + 0.002"
          :opacity="SHADOW.opacity"
          :blur="SHADOW.blur"
          :color="colors.shadow"
          :scale="SHADOW.scale"
          :resolution="768"
          :smooth="true"
        />
      </TresGroup>

      <RowTrack
        :rows="props.rows"
        :highlighted-row-index="props.highlightedRowIndex"
        :highlight-color="colors.accentWarm"
      />

      <SubmitStaging
        :your-card="props.stagedYourCard"
        :opponent-visible="props.opponentStagingVisible"
        @register-opponent-opacity="emit('register-opponent-opacity', $event)"
      />

      <StagingFlightMesh />

      <HandFan
        :hand="props.myHand"
        :selected-card-id="props.selectedCardId"
        :submitted-card-id="props.submittedCardId"
        :hidden-card-ids="props.hiddenHandCardIds"
        :disabled="props.handDisabled"
        :freeze-visuals="props.handFrozen"
        @select="emit('select', $event)"
      />
    </TresCanvas>
    <SceneAxisLegend />
  </div>
</template>

<style scoped>
.scene-canvas {
  display: block;
  min-height: 0;
  overflow: hidden;
  background: var(--color-scene-clear);
}
</style>
