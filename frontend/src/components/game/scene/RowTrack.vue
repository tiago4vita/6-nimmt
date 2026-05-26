<script setup lang="ts">
import { computed } from 'vue'

import CardMesh from '@/components/game/scene/CardMesh.vue'
import type { Row } from '@/graphql/types'
import { ROW_AREA, TABLE } from '@/lib/scene/constants'
import { rowCardPosition, rowLaneCenterX, rowLaneCenterZ } from '@/lib/scene/rowLayout'

const props = defineProps<{
  rows: Row[]
  highlightedRowIndex: number | null
  highlightColor: string
}>()

const flatRotation: [number, number, number] = [-Math.PI / 2, 0, 0]
const sortedRows = computed(() => [...props.rows].sort((a, b) => a.index - b.index))
</script>

<template>
  <TresGroup>
    <template v-for="row in sortedRows" :key="row.index">
      <TresMesh
        v-if="highlightedRowIndex === row.index"
        :position="[rowLaneCenterX(), TABLE.y + 0.0012, rowLaneCenterZ(row.index)]"
        :rotation="flatRotation"
      >
        <TresPlaneGeometry :args="[ROW_AREA.width, ROW_AREA.laneSpacing * 0.88]" />
        <TresMeshStandardMaterial
          :color="highlightColor"
          :transparent="true"
          :opacity="0.2"
          :depth-write="false"
        />
      </TresMesh>

      <CardMesh
        v-for="(card, cardIndex) in row.cards"
        :key="card.id"
        :card="card"
        :position="rowCardPosition(cardIndex, row.index)"
      />
    </template>
  </TresGroup>
</template>
