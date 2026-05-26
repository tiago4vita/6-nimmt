<script setup lang="ts">
import { computed } from 'vue'

import CardMesh from '@/components/game/scene/CardMesh.vue'
import type { Row } from '@/graphql/types'
import { ROW_AREA, TABLE } from '@/lib/scene/constants'
import { rowCardPosition, rowLaneCenterZ, rowLaneDividerZ } from '@/lib/scene/rowLayout'

const props = defineProps<{
  rows: Row[]
  highlightedRowIndex: number | null
}>()

const flatRotation: [number, number, number] = [-Math.PI / 2, 0, 0]
const sortedRows = computed(() => [...props.rows].sort((a, b) => a.index - b.index))
const laneDividerIndexes = [0, 1, 2]
const highlightColor = '#e85d04'
</script>

<template>
  <TresGroup>
    <!-- Felt play zone — slightly recessed tint on the table -->
    <TresMesh :position="[0, TABLE.y + 0.0005, 0]" :rotation="flatRotation">
      <TresPlaneGeometry :args="[ROW_AREA.width, ROW_AREA.depth]" />
      <TresMeshStandardMaterial
        color="#ebe7e0"
        :roughness="0.88"
        :metalness="0"
        :transparent="true"
        :opacity="0.92"
      />
    </TresMesh>

    <!-- Etched lane guides between rows -->
    <TresMesh
      v-for="dividerIndex in laneDividerIndexes"
      :key="`divider-${dividerIndex}`"
      :position="[0, TABLE.y + 0.0008, rowLaneDividerZ(dividerIndex)]"
      :rotation="flatRotation"
    >
      <TresPlaneGeometry :args="[ROW_AREA.width * 0.94, 0.06]" />
      <TresMeshStandardMaterial color="#d8d3cb" :roughness="0.95" :metalness="0" />
    </TresMesh>

    <template v-for="row in sortedRows" :key="row.index">
      <!-- Per-lane groove -->
      <TresMesh
        :position="[0, TABLE.y + 0.0007, rowLaneCenterZ(row.index)]"
        :rotation="flatRotation"
      >
        <TresPlaneGeometry :args="[ROW_AREA.width * 0.94, ROW_AREA.laneSpacing * 0.82]" />
        <TresMeshStandardMaterial
          color="#e3dfd8"
          :roughness="0.9"
          :metalness="0"
          :transparent="true"
          :opacity="0.55"
        />
      </TresMesh>

      <!-- Amber highlight on last resolved row -->
      <TresMesh
        v-if="highlightedRowIndex === row.index"
        :position="[0, TABLE.y + 0.0012, rowLaneCenterZ(row.index)]"
        :rotation="flatRotation"
      >
        <TresPlaneGeometry
          :args="[ROW_AREA.width * 0.92, ROW_AREA.laneSpacing * 0.86]"
        />
        <TresMeshStandardMaterial
          :color="highlightColor"
          :transparent="true"
          :opacity="0.2"
          :depth-write="false"
        />
      </TresMesh>

      <!-- Row cards — face-up, flat, subscription order left → right -->
      <CardMesh
        v-for="(card, cardIndex) in row.cards"
        :key="card.id"
        :card="card"
        :position="rowCardPosition(cardIndex, row.index, row.cards.length)"
      />
    </template>
  </TresGroup>
</template>
