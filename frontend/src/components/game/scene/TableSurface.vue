<script setup lang="ts">
import { TABLE } from '@/lib/scene/constants'

const surfaceRotation: [number, number, number] = [-Math.PI / 2, 0, 0]
</script>

<template>
  <TresGroup>
    <TresMesh
      :position="[0, TABLE.y - 0.008, 0]"
      :rotation="surfaceRotation"
      receive-shadow
    >
      <TresPlaneGeometry :args="[TABLE.width * 1.04, TABLE.depth * 1.04]" />
      <TresMeshStandardMaterial
        :color="TABLE.edgeColor"
        :roughness="0.92"
        :metalness="0"
      />
    </TresMesh>

    <TresMesh
      :position="[0, TABLE.y, 0]"
      :rotation="surfaceRotation"
      receive-shadow
    >
      <TresPlaneGeometry :args="[TABLE.width, TABLE.depth]" />
      <TresMeshPhysicalMaterial
        :color="TABLE.surfaceColor"
        :roughness="TABLE.roughness"
        :metalness="TABLE.metalness"
        :clearcoat="0.12"
        :clearcoat-roughness="0.45"
      />
    </TresMesh>
  </TresGroup>
</template>
