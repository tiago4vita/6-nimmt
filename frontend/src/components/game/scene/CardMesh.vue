<script setup lang="ts">
import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import { markRaw, onBeforeUnmount, shallowRef, watch } from 'vue'

import type { Card } from '@/graphql/types'
import {
  createCardBackTexture,
  createCardFaceTexture,
  disposeCardFaceTexture,
} from '@/lib/scene/cardAppearance'
import { CARD } from '@/lib/scene/constants'
import { hexTokenToNumber, readColorToken, SCENE_COLOR_TOKENS } from '@/lib/scene/tokens'

const accentHex = hexTokenToNumber(readColorToken(SCENE_COLOR_TOKENS.accent))
const faceTint = markRaw(new Color(0xffffff))
const accentColor = markRaw(new Color(accentHex))

const props = withDefaults(
  defineProps<{
    card: Card
    position?: [number, number, number]
    rotation?: [number, number, number]
    orientation?: 'table' | 'hand'
    dimmed?: boolean
    selected?: boolean
    interactive?: boolean
    renderOrder?: number
  }>(),
  {
    orientation: 'table',
    dimmed: false,
    selected: false,
    interactive: false,
    renderOrder: 0,
  },
)

const emit = defineEmits<{
  select: [cardId: string]
}>()

const root = shallowRef<Group | null>(null)
const CARD_MATERIAL = {
  alphaTest: 0.08,
  depthWrite: true,
  toneMapped: false,
} as const

const faceMaterial = markRaw(
  new MeshBasicMaterial({
    map: createCardFaceTexture(props.card.value, props.card.bones),
    transparent: true,
    ...CARD_MATERIAL,
  }),
)
const backMaterial = markRaw(
  new MeshBasicMaterial({
    map: createCardBackTexture(),
    transparent: true,
    ...CARD_MATERIAL,
  }),
)
const hitMaterial = markRaw(new MeshBasicMaterial({ visible: false }))

const cardPlane = markRaw(new PlaneGeometry(CARD.width, CARD.height))
const halfDepth = CARD.depth / 2
/** Bias the face toward the camera so the back plane cannot peek past the silhouette. */
const FACE_BIAS = 0.004

function buildCardGroup(): Group {
  const group = markRaw(new Group())

  if (props.orientation === 'hand') {
    const face = markRaw(new Mesh(cardPlane, faceMaterial))
    face.position.z = halfDepth + FACE_BIAS
    face.renderOrder = 1

    const back = markRaw(new Mesh(cardPlane, backMaterial))
    back.position.z = -halfDepth
    back.rotation.y = Math.PI
    back.renderOrder = 0

    group.add(back, face)
  } else {
    const face = markRaw(new Mesh(cardPlane, faceMaterial))
    face.rotation.x = -Math.PI / 2
    face.position.y = halfDepth + FACE_BIAS
    face.renderOrder = 1

    const back = markRaw(new Mesh(cardPlane, backMaterial))
    back.rotation.x = Math.PI / 2
    back.position.y = -halfDepth
    back.renderOrder = 0

    group.add(back, face)
  }

  const hitBox = markRaw(new Mesh(new BoxGeometry(CARD.width, CARD.height, CARD.depth), hitMaterial))
  group.add(hitBox)

  applyTransform(group)
  applyVisualState(group)
  return group
}

function applyTransform(target: Group): void {
  if (props.position) {
    target.position.set(...props.position)
  }
  if (props.rotation) {
    target.rotation.set(...props.rotation)
  }
  target.renderOrder = props.renderOrder
}

function applyVisualState(target: Group): void {
  const opacity = props.dimmed ? 0.42 : 1
  faceTint.set(0xffffff)
  if (props.selected) {
    faceTint.lerp(accentColor, 0.18)
  }
  faceMaterial.color.copy(faceTint)

  target.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const material of materials) {
      if (material === hitMaterial) {
        continue
      }
      material.transparent = opacity < 1 || material === faceMaterial || material === backMaterial
      material.opacity = opacity
      material.needsUpdate = true
    }
  })
}

root.value = buildCardGroup()

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
    if (!root.value || !position) {
      return
    }
    root.value.position.set(...position)
  },
  { deep: true },
)

watch(
  () => props.rotation,
  (rotation) => {
    if (!root.value || !rotation) {
      return
    }
    root.value.rotation.set(...rotation)
  },
  { deep: true },
)

watch(
  () => [props.dimmed, props.selected] as const,
  () => {
    if (root.value) {
      applyVisualState(root.value)
    }
  },
)

function handleClick(event: { stopPropagation: () => void }): void {
  if (!props.interactive) {
    return
  }
  event.stopPropagation()
  emit('select', props.card.id)
}

function handlePointerEnter(): void {
  if (props.interactive) {
    document.body.style.cursor = 'pointer'
  }
}

function handlePointerLeave(): void {
  document.body.style.cursor = ''
}

onBeforeUnmount(() => {
  document.body.style.cursor = ''
  disposeCardFaceTexture(faceMaterial.map)
  faceMaterial.dispose()
  backMaterial.dispose()
  hitMaterial.dispose()
  cardPlane.dispose()
})
</script>

<template>
  <primitive
    v-if="root"
    :object="root"
    @click="handleClick"
    @pointerenter="handlePointerEnter"
    @pointerleave="handlePointerLeave"
  />
</template>
