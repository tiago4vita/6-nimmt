<script setup lang="ts">
import {
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import { computed, markRaw, onBeforeUnmount, ref, shallowRef, watch } from 'vue'

import type { Card } from '@/graphql/types'
import { useCardJiggle } from '@/composables/useCardJiggle'
import { useCardLift, type CardLiftTier } from '@/composables/useCardLift'
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
    orientation?: 'table' | 'hand' | 'staging'
    dimmed?: boolean
    selected?: boolean
    interactive?: boolean
    showBackOnly?: boolean
    opacity?: number
    renderOrder?: number
  }>(),
  {
    orientation: 'table',
    dimmed: false,
    selected: false,
    interactive: false,
    showBackOnly: false,
    opacity: 1,
    renderOrder: 0,
  },
)

const emit = defineEmits<{
  select: [cardId: string]
}>()

const root = shallowRef<Group | null>(null)
const hovered = ref(false)
const selectionRing = shallowRef<LineSegments | null>(null)
const selectionRingMaterial = shallowRef<LineBasicMaterial | null>(null)

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

const liftEnabled = computed(
  () => props.orientation === 'hand' && props.interactive && !props.dimmed,
)

const liftTier = computed<CardLiftTier>(() => {
  if (!liftEnabled.value) {
    return 'rest'
  }
  if (props.selected) {
    return 'selected'
  }
  if (hovered.value) {
    return 'hover'
  }
  return 'rest'
})

const selectedRef = computed(() => props.selected)

function applyTransform(target: Group): void {
  if (props.position) {
    target.position.set(
      props.position[0] + jiggle.offsetX,
      props.position[1] + lift.offsetY + jiggle.offsetY,
      props.position[2] + lift.offsetZ + jiggle.offsetZ,
    )
  }
  if (props.rotation) {
    target.rotation.set(
      props.rotation[0] + jiggle.rotX,
      props.rotation[1] + jiggle.rotY,
      props.rotation[2] + jiggle.rotZ,
    )
  }
  target.scale.setScalar(lift.scale)
  target.renderOrder = props.renderOrder
}

function applyVisualState(target: Group): void {
  const baseOpacity = props.opacity
  const opacity = props.dimmed ? baseOpacity * 0.42 : baseOpacity
  faceTint.set(0xffffff)
  if (props.selected) {
    faceTint.lerp(accentColor, 0.22)
  } else if (hovered.value && liftEnabled.value) {
    faceTint.lerp(accentColor, 0.06)
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

  const ringMaterial = selectionRingMaterial.value
  const ring = selectionRing.value
  if (ringMaterial && ring) {
    ringMaterial.opacity = lift.ringOpacity
    ringMaterial.transparent = lift.ringOpacity < 1
    ring.visible = lift.ringOpacity > 0.01
    ringMaterial.needsUpdate = true
  }
}

function refreshCardPresentation(): void {
  if (!root.value) {
    return
  }
  applyTransform(root.value)
  applyVisualState(root.value)
}

const { lift } = useCardLift({
  tier: liftTier,
  enabled: liftEnabled,
  onUpdate: refreshCardPresentation,
})

const { jiggle, triggerJiggle } = useCardJiggle({
  cardId: props.card.id,
  hovered,
  selected: selectedRef,
  enabled: liftEnabled,
  onUpdate: refreshCardPresentation,
})

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

    const ringMaterial = markRaw(
      new LineBasicMaterial({
        color: accentHex,
        transparent: true,
        opacity: 0,
        depthTest: true,
        toneMapped: false,
      }),
    )
    const ringGeometry = markRaw(
      new EdgesGeometry(new BoxGeometry(CARD.width + 0.05, CARD.height + 0.05, 0.002)),
    )
    const ring = markRaw(new LineSegments(ringGeometry, ringMaterial))
    ring.position.z = halfDepth + FACE_BIAS + 0.003
    ring.renderOrder = 2
    ring.visible = false

    selectionRingMaterial.value = ringMaterial
    selectionRing.value = ring

    group.add(back, face, ring)
  } else if (props.orientation === 'staging') {
    if (props.showBackOnly) {
      const back = markRaw(new Mesh(cardPlane, backMaterial))
      back.rotation.x = -Math.PI / 2
      back.position.y = halfDepth + FACE_BIAS
      back.renderOrder = 1
      group.add(back)
    } else {
      const face = markRaw(new Mesh(cardPlane, faceMaterial))
      face.rotation.x = Math.PI / 2
      face.position.y = -halfDepth - FACE_BIAS
      face.renderOrder = 1

      const back = markRaw(new Mesh(cardPlane, backMaterial))
      back.rotation.x = -Math.PI / 2
      back.position.y = halfDepth
      back.renderOrder = 0

      group.add(back, face)
    }
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
  () => {
    if (root.value) {
      applyTransform(root.value)
    }
  },
  { deep: true },
)

watch(
  () => props.rotation,
  () => {
    if (root.value) {
      applyTransform(root.value)
    }
  },
  { deep: true },
)

watch(
  () => [props.dimmed, props.selected, props.opacity] as const,
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
  if (!props.interactive) {
    return
  }
  hovered.value = true
  triggerJiggle()
  document.body.style.cursor = 'pointer'
  if (root.value) {
    applyVisualState(root.value)
  }
}

function handlePointerLeave(): void {
  hovered.value = false
  document.body.style.cursor = ''
  if (root.value) {
    applyVisualState(root.value)
  }
}

onBeforeUnmount(() => {
  document.body.style.cursor = ''
  disposeCardFaceTexture(faceMaterial.map)
  faceMaterial.dispose()
  backMaterial.dispose()
  hitMaterial.dispose()
  selectionRingMaterial.value?.dispose()
  selectionRing.value?.geometry.dispose()
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
