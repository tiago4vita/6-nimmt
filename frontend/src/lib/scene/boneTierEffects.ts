/**
 * Runtime bone-tier VFX on 3D card faces — pulse rings, shimmer sweeps, sparkle fields.
 * Canvas tier art lives in cardAppearance.ts; this layer adds motion + depth.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  type Mesh as ThreeMesh,
} from 'three'

import { boneMaterialTier, type BoneMaterialTier } from '@/lib/scene/cardAppearance'
import { CARD } from '@/lib/scene/constants'

export interface BoneTierEffectHandle {
  dispose: () => void
}

interface EffectEntry {
  update: (timeMs: number) => void
  dispose: () => void
}

const registry = new Set<EffectEntry>()

let sparkleTexture: CanvasTexture | null = null

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function tierAccentColor(tier: BoneMaterialTier): number {
  if (tier >= 7) {
    return 0xff1a4d
  }
  if (tier >= 5) {
    return 0xff5a1a
  }
  return 0xffcc66
}

function getSparkleTexture(): CanvasTexture {
  if (sparkleTexture) {
    return sparkleTexture
  }

  const size = 96
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const center = size / 2
    const glow = ctx.createRadialGradient(center, center, 0, center, center, center)
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)')
    glow.addColorStop(0.2, 'rgba(255, 248, 220, 0.95)')
    glow.addColorStop(0.45, 'rgba(255, 120, 160, 0.55)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, size, size)
  }

  sparkleTexture = new CanvasTexture(canvas)
  sparkleTexture.colorSpace = SRGBColorSpace
  sparkleTexture.minFilter = LinearFilter
  sparkleTexture.magFilter = LinearFilter
  sparkleTexture.needsUpdate = true
  return sparkleTexture
}

function registerEffect(entry: EffectEntry): void {
  registry.add(entry)
}

function unregisterEffect(entry: EffectEntry): void {
  registry.delete(entry)
}

export function updateBoneTierEffects(timeMs: number): void {
  for (const entry of registry) {
    entry.update(timeMs)
  }
}

function createSoftBloom(faceMesh: ThreeMesh, tier: BoneMaterialTier): EffectEntry {
  const bloom = new Mesh(
    new PlaneGeometry(CARD.width * 1.08, CARD.height * 1.08),
    new MeshBasicMaterial({
      color: tier >= 5 ? 0xff8844 : 0xffe8c0,
      transparent: true,
      opacity: tier >= 5 ? 0.22 : 0.14,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  bloom.position.z = -0.004
  bloom.renderOrder = faceMesh.renderOrder - 1
  faceMesh.add(bloom)

  return {
    update(timeMs) {
      if (prefersReducedMotion()) {
        return
      }
      const material = bloom.material as MeshBasicMaterial
      const pulse = 0.75 + 0.25 * Math.sin(timeMs * 0.0035)
      material.opacity = (tier >= 5 ? 0.26 : 0.16) * pulse
    },
    dispose() {
      faceMesh.remove(bloom)
      bloom.geometry.dispose()
      ;(bloom.material as MeshBasicMaterial).dispose()
    },
  }
}

function createShimmerSweep(faceMesh: ThreeMesh, tier: BoneMaterialTier): EffectEntry {
  const band = new Mesh(
    new PlaneGeometry(CARD.width * 0.34, CARD.height * 1.12),
    new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: tier >= 7 ? 0.38 : 0.24,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  )
  band.position.z = 0.006
  band.renderOrder = faceMesh.renderOrder + 2
  faceMesh.add(band)

  return {
    update(timeMs) {
      if (prefersReducedMotion()) {
        band.position.x = 0
        return
      }
      const cycle = (timeMs * 0.00055) % 2
      const travel = cycle < 1 ? cycle : 2 - cycle
      band.position.x = (travel - 0.5) * CARD.width * 1.35
      const material = band.material as MeshBasicMaterial
      material.opacity = (tier >= 7 ? 0.42 : 0.28) * (0.65 + 0.35 * Math.sin(timeMs * 0.008))
    },
    dispose() {
      faceMesh.remove(band)
      band.geometry.dispose()
      ;(band.material as MeshBasicMaterial).dispose()
    },
  }
}

function createPulseRing(
  faceMesh: ThreeMesh,
  tier: BoneMaterialTier,
  scale: number,
  baseOpacity: number,
): { update: (timeMs: number) => void; dispose: () => void } {
  const geometry = new EdgesGeometry(
    new PlaneGeometry(CARD.width * scale, CARD.height * scale),
  )
  const material = new LineBasicMaterial({
    color: tierAccentColor(tier),
    transparent: true,
    opacity: baseOpacity,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  })
  const lines = new LineSegments(geometry, material)
  lines.position.z = 0.004
  lines.renderOrder = faceMesh.renderOrder + 1
  faceMesh.add(lines)

  const phase = scale * 1.7

  return {
    update(timeMs) {
      const materialRef = lines.material as LineBasicMaterial
      if (prefersReducedMotion()) {
        materialRef.opacity = baseOpacity
        return
      }
      const pulse = 0.45 + 0.55 * Math.sin(timeMs * 0.0045 + phase)
      materialRef.opacity = baseOpacity * pulse
      const tint = new Color(tierAccentColor(tier))
      if (tier >= 7) {
        tint.lerp(new Color(0xffffff), 0.15 + 0.15 * pulse)
      }
      materialRef.color.copy(tint)
    },
    dispose() {
      faceMesh.remove(lines)
      geometry.dispose()
      material.dispose()
    },
  }
}

function createEmissivePulse(faceMesh: ThreeMesh, tier: BoneMaterialTier): EffectEntry {
  const inner = createPulseRing(faceMesh, tier, 1.02, tier >= 7 ? 0.95 : 0.72)
  const outer = createPulseRing(faceMesh, tier, 1.09, tier >= 7 ? 0.55 : 0.38)

  return {
    update(timeMs) {
      inner.update(timeMs)
      outer.update(timeMs)
    },
    dispose() {
      inner.dispose()
      outer.dispose()
    },
  }
}

function createSparkleCloud(faceMesh: ThreeMesh): EffectEntry {
  const count = 44
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)

  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * CARD.width * 0.88
    positions[index * 3 + 1] = (Math.random() - 0.5) * CARD.height * 0.88
    positions[index * 3 + 2] = 0.008 + Math.random() * 0.012
    phases[index] = Math.random() * Math.PI * 2
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))

  const material = new PointsMaterial({
    map: getSparkleTexture(),
    size: 0.14,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    color: 0xffffff,
  })

  const points = new Points(geometry, material)
  points.renderOrder = faceMesh.renderOrder + 3
  faceMesh.add(points)

  return {
    update(timeMs) {
      if (prefersReducedMotion()) {
        material.opacity = 0.85
        return
      }
      material.opacity =
        0.55 + 0.4 * Math.sin(timeMs * 0.005) + 0.08 * Math.sin(timeMs * 0.019)
      const attr = geometry.getAttribute('position') as BufferAttribute
      for (let index = 0; index < count; index += 1) {
        const twinkle = 0.004 * Math.sin(timeMs * 0.012 + phases[index]!)
        attr.setZ(index, 0.008 + twinkle + (index % 5) * 0.0015)
      }
      attr.needsUpdate = true
    },
    dispose() {
      faceMesh.remove(points)
      geometry.dispose()
      material.dispose()
    },
  }
}

function createScanlineShimmer(faceMesh: ThreeMesh): EffectEntry {
  const overlay = new Mesh(
    new PlaneGeometry(CARD.width, CARD.height * 0.09),
    new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: DoubleSide,
    }),
  )
  overlay.position.z = 0.007
  overlay.renderOrder = faceMesh.renderOrder + 2
  faceMesh.add(overlay)

  return {
    update(timeMs) {
      if (prefersReducedMotion()) {
        overlay.position.y = 0
        return
      }
      const travel = ((timeMs * 0.00035) % 1) * 2 - 1
      overlay.position.y = travel * CARD.height * 0.46
      const material = overlay.material as MeshBasicMaterial
      material.opacity = 0.14 + 0.16 * Math.sin(timeMs * 0.011)
    },
    dispose() {
      faceMesh.remove(overlay)
      overlay.geometry.dispose()
      ;(overlay.material as MeshBasicMaterial).dispose()
    },
  }
}

export function attachBoneTierEffects(
  _group: Group,
  faceMesh: ThreeMesh,
  bones: number,
): BoneTierEffectHandle | null {
  const tier = boneMaterialTier(bones)
  const entries: EffectEntry[] = []

  if (tier >= 2) {
    entries.push(createSoftBloom(faceMesh, tier))
  }
  if (tier >= 3) {
    entries.push(createShimmerSweep(faceMesh, tier))
  }
  if (tier >= 5) {
    entries.push(createEmissivePulse(faceMesh, tier))
  }
  if (tier >= 7) {
    entries.push(createSparkleCloud(faceMesh))
    entries.push(createScanlineShimmer(faceMesh))
  }

  if (entries.length === 0) {
    return null
  }

  for (const entry of entries) {
    registerEffect(entry)
  }

  return {
    dispose() {
      for (const entry of entries) {
        unregisterEffect(entry)
        entry.dispose()
      }
    },
  }
}
