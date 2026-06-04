import { CanvasTexture, Color, LinearFilter, SRGBColorSpace, type Texture } from 'three'

import { hueBandForValue, readCardFaceColors } from '@/lib/cardColors'

export type { CardHueBand as HueBand } from '@/lib/cardColors'
export { hueBandForValue } from '@/lib/cardColors'

/** Shared art board — face and back use identical dimensions and corner radius. */
export const CARD_TEXTURE = {
  width: 512,
  height: 720,
  /** Full-bleed art — no inset margin that would reveal the back plane through the face. */
  inset: 0,
  radius: 36,
} as const

const TEXTURE_VERSION = 3

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

function buildFaceCanvas(value: number, bones: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_TEXTURE.width
  canvas.height = CARD_TEXTURE.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const colors = readCardFaceColors()
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const band = hueBandForValue(value)
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, band.from)
  gradient.addColorStop(1, band.to)
  fillRoundedPanel(ctx, gradient)

  ctx.fillStyle = colors.faceText
  ctx.font = '700 256px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = colors.faceShadow
  ctx.shadowBlur = 12
  ctx.fillText(String(value), canvas.width / 2, canvas.height * 0.4)
  ctx.shadowBlur = 0

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
