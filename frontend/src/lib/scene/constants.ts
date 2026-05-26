import { MathUtils } from 'three'

/** Card mesh sizing — used by hand fan, row track, and staging (6.2+). */
export const CARD = {
  width: 0.72,
  height: 1.0,
  depth: 0.045,
  gap: 0.08,
} as const

/** Table plane — large enough to feel infinite at the tilted camera angle. */
export const TABLE = {
  width: 28,
  depth: 20,
  y: 0,
  surfaceColor: 0xf4f2ed,
  edgeColor: 0xe8e4dc,
  roughness: 0.38,
  metalness: 0.06,
} as const

/** Row track footprint on the table (cards land here in 6.3). */
export const ROW_AREA = {
  center: [0, TABLE.y, 0] as [number, number, number],
  width: 14,
  depth: 9,
  laneCount: 4,
  laneSpacing: 2.1,
} as const

/** Hand fan anchor — near edge of table toward the camera. */
export const HAND_ANCHOR = {
  z: TABLE.depth / 2 - 2.4,
  liftY: TABLE.y + CARD.depth / 2 + 0.004,
} as const

export const CAMERA = {
  fov: 38,
  pitchDeg: 30,
  distance: 17,
  near: 0.1,
  far: 100,
  target: ROW_AREA.center,
} as const

export const SCENE = {
  clearColor: '#e8e6e1',
} as const

export const LIGHTING = {
  ambientIntensity: 0.52,
  ambientColor: '#fffaf5',
  directionalIntensity: 0.62,
  directionalColor: '#fff8ee',
  directionalPosition: [10, 18, 8] as [number, number, number],
  hemisphereIntensity: 0.22,
  hemisphereSky: '#ffffff',
  hemisphereGround: '#d4d0c8',
} as const

export function cameraPosition(): [number, number, number] {
  const pitchRad = MathUtils.degToRad(CAMERA.pitchDeg)
  const [tx, ty, tz] = CAMERA.target
  const horizontal = Math.cos(pitchRad) * CAMERA.distance
  const y = ty + Math.sin(pitchRad) * CAMERA.distance
  const z = tz + horizontal
  return [tx, y, z]
}

export const TABLE_HALF_WIDTH = TABLE.width / 2
export const TABLE_HALF_DEPTH = TABLE.depth / 2
export const CONTACT_SHADOW_SCALE = Math.max(TABLE.width, TABLE.depth)
