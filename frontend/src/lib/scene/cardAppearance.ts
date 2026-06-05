import { CanvasTexture, Color, LinearFilter, SRGBColorSpace, type Texture } from 'three'

import { hueBandForValue, readCardFaceColors } from '@/lib/cardColors'

export type { CardHueBand as HueBand } from '@/lib/cardColors'
export { hueBandForValue } from '@/lib/cardColors'

/** V1 bone-tier material steps — see roadmap 6.11. */
export type BoneMaterialTier = 1 | 2 | 3 | 5 | 7

export function boneMaterialTier(bones: number): BoneMaterialTier {
  if (bones >= 7) {
    return 7
  }
  if (bones >= 5) {
    return 5
  }
  if (bones >= 3) {
    return 3
  }
  if (bones >= 2) {
    return 2
  }
  return 1
}

/** Shared art board — face and back use identical dimensions and corner radius. */
export const CARD_TEXTURE = {
  width: 512,
  height: 720,
  /** Full-bleed art — no inset margin that would reveal the back plane through the face. */
  inset: 0,
  radius: 36,
} as const

const TEXTURE_VERSION = 5

const faceTextureCache = new Map<string, CanvasTexture>()
let backTextureCache: CanvasTexture | null = null

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function artRect(): { x: number; y: number; w: number; h: number } {
  const { width, height, inset } = CARD_TEXTURE
  return { x: inset, y: inset, w: width - inset * 2, h: height - inset * 2 }
}

function fillRoundedPanel(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient): void {
  const { x, y, w, h } = artRect()
  roundRect(ctx, x, y, w, h, CARD_TEXTURE.radius)
  ctx.fillStyle = fill
  ctx.fill()
}

function strokeRoundedPanel(
  ctx: CanvasRenderingContext2D,
  stroke: string,
  lineWidth: number,
): void {
  const { x, y, w, h } = artRect()
  roundRect(ctx, x, y, w, h, CARD_TEXTURE.radius)
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.stroke()
}

function drawInnerGlow(ctx: CanvasRenderingContext2D, intensity: number): void {
  const { w, h } = artRect()
  const cx = CARD_TEXTURE.width / 2
  const cy = CARD_TEXTURE.height * 0.42
  const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(w, h) * 0.62)
  glow.addColorStop(0, `rgba(255, 255, 255, ${0.34 * intensity})`)
  glow.addColorStop(0.45, `rgba(255, 255, 255, ${0.14 * intensity})`)
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)')

  ctx.save()
  ctx.globalCompositeOperation = 'soft-light'
  fillRoundedPanel(ctx, glow)
  ctx.restore()
}

function drawShimmer(ctx: CanvasRenderingContext2D, tier: BoneMaterialTier): void {
  const { x, y, w, h } = artRect()
  ctx.save()
  roundRect(ctx, x, y, w, h, CARD_TEXTURE.radius)
  ctx.clip()
  const alpha = tier >= 7 ? 0.22 : tier >= 5 ? 0.18 : 0.14
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
  ctx.lineWidth = tier >= 5 ? 4 : 3
  const spacing = tier >= 7 ? 36 : 44
  for (let offset = -h; offset < w + h; offset += spacing) {
    ctx.beginPath()
    ctx.moveTo(x + offset, y)
    ctx.lineTo(x + offset + h, y + h)
    ctx.stroke()
  }
  ctx.restore()
}

function drawDangerVignette(ctx: CanvasRenderingContext2D, tier: BoneMaterialTier): void {
  const { w, h } = artRect()
  const cx = CARD_TEXTURE.width / 2
  const cy = CARD_TEXTURE.height / 2
  const vignette = ctx.createRadialGradient(
    cx,
    cy,
    Math.max(w, h) * 0.2,
    cx,
    cy,
    Math.max(w, h) * 0.72,
  )
  const strength = tier >= 7 ? 0.55 : 0.32
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(0.65, `rgba(40, 0, 10, ${strength * 0.35})`)
  vignette.addColorStop(1, `rgba(20, 0, 0, ${strength})`)

  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  fillRoundedPanel(ctx, vignette)
  ctx.restore()
}

function drawCornerFlares(ctx: CanvasRenderingContext2D): void {
  const { x, y, w, h } = artRect()
  const corners = [
    [x + 28, y + 28],
    [x + w - 28, y + 28],
    [x + 28, y + h - 28],
    [x + w - 28, y + h - 28],
  ] as const

  ctx.save()
  roundRect(ctx, x, y, w, h, CARD_TEXTURE.radius)
  ctx.clip()
  for (const [cx, cy] of corners) {
    const flare = ctx.createRadialGradient(cx, cy, 0, cx, cy, 72)
    flare.addColorStop(0, 'rgba(255, 80, 110, 0.75)')
    flare.addColorStop(0.45, 'rgba(255, 40, 70, 0.28)')
    flare.addColorStop(1, 'rgba(255, 0, 0, 0)')
    ctx.fillStyle = flare
    ctx.fillRect(cx - 72, cy - 72, 144, 144)
  }
  ctx.restore()
}

function drawEdgeGlow(ctx: CanvasRenderingContext2D, tier: BoneMaterialTier): void {
  const alpha = tier === 7 ? 0.92 : 0.68
  const color = tier === 7 ? `rgba(255, 24, 64, ${alpha})` : `rgba(255, 96, 24, ${alpha})`
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = tier === 7 ? 34 : 22
  strokeRoundedPanel(ctx, color, tier === 7 ? 7 : 5)
  ctx.shadowBlur = tier === 7 ? 18 : 12
  strokeRoundedPanel(ctx, `rgba(255, 255, 255, ${tier === 7 ? 0.35 : 0.22})`, 2)
  ctx.restore()
}

function drawScanlines(ctx: CanvasRenderingContext2D): void {
  const { x, y, w, h } = artRect()
  ctx.save()
  roundRect(ctx, x, y, w, h, CARD_TEXTURE.radius)
  ctx.clip()
  for (let row = y; row < y + h; row += 5) {
    ctx.fillStyle = row % 10 === 0 ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 255, 255, 0.05)'
    ctx.fillRect(x, row, w, 2)
  }
  ctx.restore()
}

function drawBoneMarker(
  ctx: CanvasRenderingContext2D,
  bones: number,
  cx: number,
  cy: number,
  markerColor: string,
): void {
  ctx.fillStyle = markerColor
  ctx.font = '600 68px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${bones}`, cx - 28, cy)

  ctx.beginPath()
  ctx.arc(cx + 36, cy, 10, 0, Math.PI * 2)
  ctx.fill()
  if (bones >= 2) {
    ctx.beginPath()
    ctx.arc(cx + 64, cy, 10, 0, Math.PI * 2)
    ctx.fill()
  }
  if (bones >= 3) {
    ctx.beginPath()
    ctx.arc(cx + 92, cy, 10, 0, Math.PI * 2)
    ctx.fill()
  }
}

function applyTierFaceTreatment(
  ctx: CanvasRenderingContext2D,
  tier: BoneMaterialTier,
  gradient: CanvasGradient,
): void {
  if (tier === 1) {
    fillRoundedPanel(ctx, gradient)
    return
  }

  ctx.save()
  if (tier >= 3) {
    ctx.filter =
      tier >= 7
        ? 'saturate(1.85) contrast(1.12) brightness(1.04)'
        : tier >= 5
          ? 'saturate(1.68) contrast(1.1)'
          : 'saturate(1.38) contrast(1.05)'
  }
  fillRoundedPanel(ctx, gradient)
  ctx.filter = 'none'
  ctx.restore()

  if (tier >= 2) {
    drawInnerGlow(ctx, tier >= 7 ? 1.45 : tier >= 5 ? 1.25 : 1.05)
  }
  if (tier >= 3) {
    drawShimmer(ctx, tier)
  }
  if (tier >= 5) {
    drawDangerVignette(ctx, tier)
    drawEdgeGlow(ctx, tier)
  }
  if (tier >= 7) {
    drawCornerFlares(ctx)
    drawScanlines(ctx)
  }
}

function buildFaceCanvas(value: number, bones: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_TEXTURE.width
  canvas.height = CARD_TEXTURE.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const colors = readCardFaceColors()
  const tier = boneMaterialTier(bones)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const band = hueBandForValue(value)
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, band.from)
  gradient.addColorStop(1, band.to)
  applyTierFaceTreatment(ctx, tier, gradient)

  ctx.fillStyle = colors.faceText
  ctx.font = '700 256px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (tier >= 7) {
    ctx.shadowColor = 'rgba(255, 40, 80, 0.85)'
    ctx.shadowBlur = 28
  } else if (tier >= 5) {
    ctx.shadowColor = 'rgba(255, 90, 40, 0.65)'
    ctx.shadowBlur = 20
  } else {
    ctx.shadowColor = colors.faceShadow
    ctx.shadowBlur = 12
  }
  ctx.fillText(String(value), canvas.width / 2, canvas.height * 0.4)
  ctx.shadowBlur = 0

  if (tier >= 5) {
    ctx.save()
    ctx.strokeStyle = tier >= 7 ? 'rgba(255, 120, 150, 0.55)' : 'rgba(255, 180, 120, 0.35)'
    ctx.lineWidth = tier >= 7 ? 4 : 3
    ctx.font = '700 256px Inter, ui-sans-serif, system-ui, sans-serif'
    ctx.strokeText(String(value), canvas.width / 2, canvas.height * 0.4)
    ctx.restore()
  }

  drawBoneMarker(ctx, bones, canvas.width / 2, canvas.height * 0.78, colors.boneMarker)
  return canvas
}

function buildBackCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_TEXTURE.width
  canvas.height = CARD_TEXTURE.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const colors = readCardFaceColors()
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  fillRoundedPanel(ctx, colors.back)
  return canvas
}

function wrapCanvasTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

export function createCardFaceTexture(value: number, bones: number): CanvasTexture {
  const key = `${TEXTURE_VERSION}:${value}:${bones}`
  const cached = faceTextureCache.get(key)
  if (cached) {
    return cached
  }

  const texture = wrapCanvasTexture(buildFaceCanvas(value, bones))
  faceTextureCache.set(key, texture)
  return texture
}

export function createCardBackTexture(): CanvasTexture {
  if (!backTextureCache || backTextureCache.userData.version !== TEXTURE_VERSION) {
    backTextureCache?.dispose()
    backTextureCache = wrapCanvasTexture(buildBackCanvas())
    backTextureCache.userData.version = TEXTURE_VERSION
  }
  return backTextureCache
}

export function disposeCardFaceTexture(texture: Texture | null | undefined): void {
  if (!texture || !(texture instanceof CanvasTexture)) {
    return
  }

  for (const [key, cached] of faceTextureCache.entries()) {
    if (cached === texture) {
      faceTextureCache.delete(key)
      break
    }
  }
  texture.dispose()
}

export function cardEdgeColor(): Color {
  const { edge } = readCardFaceColors()
  return new Color(edge)
}

export function cardBackColor(): Color {
  const { back } = readCardFaceColors()
  return new Color(back)
}
