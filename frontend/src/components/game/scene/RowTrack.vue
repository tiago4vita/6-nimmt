<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useLoop } from '@tresjs/core'

import CardMesh from '@/components/game/scene/CardMesh.vue'
import type { Row } from '@/graphql/types'
import { ROW_AREA, TABLE } from '@/lib/scene/constants'
import { ROW_SHAKE_AMPLITUDE } from '@/lib/scene/resolveLayout'
import { rowCardPosition, rowLaneCenterX, rowLaneCenterZ } from '@/lib/scene/rowLayout'

const props = defineProps<{
  rows: Row[]
  highlightedRowIndex: number | null
  shakingRowIndex: number | null
  highlightColor: string
}>()

const flatRotation: [number, number, number] = [-Math.PI / 2, 0, 0]
const sortedRows = computed(() => [...props.rows].sort((a, b) => a.index - b.index))

const shakeOffsetX = ref(0)
let shakeElapsed = 0

watch(
  () => props.shakingRowIndex,
  (rowIndex) => {
    if (rowIndex === null) {
      shakeOffsetX.value = 0
      shakeElapsed = 0
    }
  },
)

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  if (props.shakingRowIndex === null) {
    return
  }

  shakeElapsed += delta
  const decay = Math.max(0, 1 - shakeElapsed * 1.35)
  shakeOffsetX.value =
    Math.sin(shakeElapsed * 42) * ROW_SHAKE_AMPLITUDE * decay
})

function rowGroupPosition(rowIndex: number): [number, number, number] {
  if (props.shakingRowIndex !== rowIndex) {
    return [0, 0, 0]
  }
  return [shakeOffsetX.value, 0, 0]
}
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

      <TresGroup :position="rowGroupPosition(row.index)">
        <CardMesh
          v-for="(card, cardIndex) in row.cards"
          :key="card.id"
          :card="card"
          :position="rowCardPosition(cardIndex, row.index)"
        />
      </TresGroup>
    </template>
  </TresGroup>
</template>
