<script setup lang="ts">
import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  type Material,
} from 'three'
import { markRaw, onBeforeUnmount, shallowRef, watch } from 'vue'

import type { Card } from '@/graphql/types'
import {
  cardBackColor,
  cardEdgeColor,
  createCardFaceTexture,
  disposeCardFaceTexture,
} from '@/lib/scene/cardAppearance'
import { CARD } from '@/lib/scene/constants'

const props = defineProps<{
  card: Card
  position?: [number, number, number]
}>()

const mesh = shallowRef<Mesh | null>(null)
const geometry = markRaw(new BoxGeometry(CARD.width, CARD.depth, CARD.height))

let edgeMaterial = markRaw(
  new MeshStandardMaterial({ color: cardEdgeColor(), roughness: 0.92, metalness: 0 }),
)
let backMaterial = markRaw(
  new MeshStandardMaterial({ color: cardBackColor(), roughness: 0.96, metalness: 0 }),
)
let faceMaterial = markRaw(
  new MeshStandardMaterial({
    map: createCardFaceTexture(props.card.value, props.card.bones),
    roughness: 0.42,
    metalness: 0.04,
  }),
)

function buildMesh(): Mesh {
  const materials: Material[] = [
    edgeMaterial,
    edgeMaterial,
    faceMaterial,
    backMaterial,
    edgeMaterial,
    edgeMaterial,
  ]
  const cardMesh = markRaw(new Mesh(geometry, materials))
  cardMesh.castShadow = true
  cardMesh.receiveShadow = true
  if (props.position) {
    cardMesh.position.set(...props.position)
  }
  return cardMesh
}

mesh.value = buildMesh()

watch(
  () => [props.card.value, props.card.bones] as const,
  ([value, bones]) => {
    disposeCardFaceTexture(faceMaterial.map)
    faceMaterial.map = createCardFaceTexture(value, bones)
    faceMaterial.needsUpdate = true
  },
)

watch(
  () => props.position,
  (position) => {
    if (!mesh.value || !position) {
      return
    }
    mesh.value.position.set(...position)
  },
  { deep: true },
)

onBeforeUnmount(() => {
  disposeCardFaceTexture(faceMaterial.map)
  edgeMaterial.dispose()
  backMaterial.dispose()
  faceMaterial.dispose()
  geometry.dispose()
})
</script>

<template>
  <primitive v-if="mesh" :object="mesh" />
</template>
