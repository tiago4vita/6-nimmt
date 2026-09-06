<script setup lang="ts">
import { AxesHelper } from 'three'
import { ScreenSizer, ScreenSpace } from '@tresjs/cientos'
import { markRaw, onBeforeUnmount } from 'vue'

import { useDevMode } from '@/composables/useDevMode'
import { PLAYFIELD, TABLE } from '@/lib/scene/constants'

const { devModeEnabled } = useDevMode()

const CORNER_GIZMO_SIZE = 1.15
const WORLD_ORIGIN_SIZE = 2.4
const PLAYFIELD_CORNER_SIZE = 1.6

const cornerAxes = markRaw(new AxesHelper(CORNER_GIZMO_SIZE))
const worldOriginAxes = markRaw(new AxesHelper(WORLD_ORIGIN_SIZE))
const playfieldCornerAxes = markRaw(new AxesHelper(PLAYFIELD_CORNER_SIZE))

onBeforeUnmount(() => {
  for (const helper of [cornerAxes, worldOriginAxes, playfieldCornerAxes]) {
    helper.geometry.dispose()
    const { material } = helper
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose())
    } else {
      material.dispose()
    }
  }
})
</script>

<template>
  <template v-if="devModeEnabled">
    <!-- Viewport corner — world axes orientation (screen-fixed position) -->
    <ScreenSpace :left="14" :bottom="14" :depth="0">
      <ScreenSizer>
        <primitive :object="cornerAxes" />
      </ScreenSizer>
    </ScreenSpace>

    <!-- World origin at table height -->
    <TresGroup :position="[0, TABLE.y, 0]">
      <primitive :object="worldOriginAxes" />
    </TresGroup>

    <!-- Playfield left-front corner (near player) -->
    <TresGroup :position="[PLAYFIELD.leftX, TABLE.y, PLAYFIELD.frontZ]">
      <primitive :object="playfieldCornerAxes" />
    </TresGroup>
  </template>
</template>
