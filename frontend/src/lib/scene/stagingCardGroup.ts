import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'

import type { Card } from '@/graphql/types'
import {
  createCardBackTexture,
  createCardFaceTexture,
  disposeCardFaceTexture,
} from '@/lib/scene/cardAppearance'
import { CARD } from '@/lib/scene/constants'

const CARD_MATERIAL = {
  alphaTest: 0.08,
  depthWrite: true,
  toneMapped: false,
} as const

const FACE_BIAS = 0.004

export interface StagingCardGroup {
  group: Group
  setOpacity: (opacity: number) => void
  setCardFace: (value: number, bones: number) => void
  setShowBack: (showBack: boolean) => void
  dispose: () => void
}

/** Lightweight staging card mesh — mutated directly during flight (no Vue prop churn). */
export function createStagingCardGroup(
  card: Card,
  showBackOnly = false,
): StagingCardGroup {
  const group = new Group()
  const cardPlane = new PlaneGeometry(CARD.width, CARD.height)
  const halfDepth = CARD.depth / 2

  const faceMaterial = new MeshBasicMaterial({
    map: createCardFaceTexture(card.value, card.bones),
    transparent: true,
    ...CARD_MATERIAL,
  })
  const backMaterial = new MeshBasicMaterial({
    map: createCardBackTexture(),
    transparent: true,
    ...CARD_MATERIAL,
  })

  const meshes: Mesh[] = []
  let faceMesh: Mesh | null = null

  if (showBackOnly) {
    const back = new Mesh(cardPlane, backMaterial)
    back.rotation.x = -Math.PI / 2
    back.position.y = halfDepth + FACE_BIAS
    back.renderOrder = 1
    group.add(back)
    meshes.push(back)
  } else {
    const face = new Mesh(cardPlane, faceMaterial)
    face.rotation.x = Math.PI / 2
    face.position.y = -halfDepth - FACE_BIAS
    face.renderOrder = 1

    const back = new Mesh(cardPlane, backMaterial)
    back.rotation.x = -Math.PI / 2
    back.position.y = halfDepth
    back.renderOrder = 0

    group.add(back, face)
    meshes.push(back, face)
    faceMesh = face
  }

  function setOpacity(opacity: number): void {
    for (const mesh of meshes) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        material.transparent = opacity < 1
        material.opacity = opacity
        material.needsUpdate = true
      }
    }
  }

  function setCardFace(value: number, bones: number): void {
    if (showBackOnly) {
      return
    }
    disposeCardFaceTexture(faceMaterial.map)
    faceMaterial.map = createCardFaceTexture(value, bones)
    faceMaterial.needsUpdate = true
  }

  function setShowBack(showBack: boolean): void {
    if (faceMesh) {
      faceMesh.visible = !showBack
    }
  }

  function dispose(): void {
    if (!showBackOnly) {
      disposeCardFaceTexture(faceMaterial.map)
    }
    faceMaterial.dispose()
    backMaterial.dispose()
    cardPlane.dispose()
  }

  return { group, setOpacity, setCardFace, setShowBack, dispose }
}

/** Hidden hit volume so flight cards match hand card bounds. */
export function attachStagingHitBox(group: Group): void {
  const hitMaterial = new MeshBasicMaterial({ visible: false })
  const hitBox = new Mesh(
    new BoxGeometry(CARD.width, CARD.height, CARD.depth),
    hitMaterial,
  )
  group.add(hitBox)
}
