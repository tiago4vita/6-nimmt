import { CanvasTexture, Color, LinearFilter, SRGBColorSpace, type Texture } from 'three'

export interface HueBand {
  from: string
  to: string
}

const HUE_BANDS: { max: number; band: HueBand }[] = [
  { max: 26, band: { from: '#6366f1', to: '#7c3aed' } },
  { max: 52, band: { from: '#14b8a6', to: '#059669' } },
  { max: 78, band: { from: '#f59e0b', to: '#ea580c' } },
  { max: Number.POSITIVE_INFINITY, band: { from: '#f43f5e', to: '#dc2626' } },
]

const textureCache = new Map<string, CanvasTexture>()

export function hueBandForValue(value: number): HueBand {
  return HUE_BANDS.find((entry) => value <= entry.max)!.band
}

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

function drawBoneMarker(ctx: CanvasRenderingContext2D, bones: number, cx: number, cy: number): void {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.font = '600 34px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${bones}`, cx - 14, cy)

  ctx.beginPath()
  ctx.arc(cx + 18, cy, 5, 0, Math.PI * 2)
  ctx.fill()
  if (bones >= 2) {
    ctx.beginPath()
    ctx.arc(cx + 32, cy, 5, 0, Math.PI * 2)
    ctx.fill()
  }
  if (bones >= 3) {
    ctx.beginPath()
    ctx.arc(cx + 46, cy, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function buildFaceCanvas(value: number, bones: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return canvas
  }

  const band = hueBandForValue(value)
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, band.from)
  gradient.addColorStop(1, band.to)
  ctx.fillStyle = gradient
  roundRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 18)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 128px Inter, ui-sans-serif, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
  ctx.shadowBlur = 8
  ctx.fillText(String(value), canvas.width / 2, canvas.height * 0.4)
  ctx.shadowBlur = 0

  drawBoneMarker(ctx, bones, canvas.width / 2, canvas.height * 0.78)
  return canvas
}

export function createCardFaceTexture(value: number, bones: number): CanvasTexture {
  const key = `${value}:${bones}`
  const cached = textureCache.get(key)
  if (cached) {
    return cached
  }

  const texture = new CanvasTexture(buildFaceCanvas(value, bones))
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.needsUpdate = true
  textureCache.set(key, texture)
  return texture
}

export function disposeCardFaceTexture(texture: Texture | null | undefined): void {
  if (!texture || !(texture instanceof CanvasTexture)) {
    return
  }

  for (const [key, cached] of textureCache.entries()) {
    if (cached === texture) {
      textureCache.delete(key)
      break
    }
  }
  texture.dispose()
}

export function cardEdgeColor(): Color {
  return new Color(0x1c1c1c)
}

export function cardBackColor(): Color {
  return new Color(0x101010)
}
