import { MathUtils } from 'three'

export const CARD = {
  width: 1.41, // world-space card face width
  height: 1.95, // world-space card face height
  depth: 0.058, // card thickness used by mesh depth and table embed
  gap: 0.1, // spacing between cards in a row track
} as const

export const TABLE = {
  y: 0, // table / ground plane height
} as const

export const PLAYFIELD = {
  width: 17, // playable area width along X
  depth: 12, // playable area depth along Z
  leftX: -8, // X coordinate of the playfield left edge
  frontZ: 7.2, // Z coordinate of the edge closest to the camera / player
  padding: 0.35, // inset from playfield edges for rows and layout math
} as const

export const ROW_AREA = {
  width: PLAYFIELD.width - PLAYFIELD.padding * 2, // row track width inside playfield padding
  depth: PLAYFIELD.depth - PLAYFIELD.padding * 2 - 2, // row track depth with extra back margin
  laneCount: 4, // number of row lanes on the table
  laneSpacing: 2.35, // world-space distance between row lane centers
  leftX: PLAYFIELD.leftX + PLAYFIELD.padding, // X anchor where row cards start growing right
  originZ: PLAYFIELD.frontZ - PLAYFIELD.padding - 0.55, // Z center of row 0, nearest the player
} as const

export const HAND_ANCHOR = {
  z: PLAYFIELD.frontZ + 1.55, // hand strip depth, in front of the playfield toward the camera
  yLift: 0.12, // extra height above the pitch-aligned hand base
} as const

export const HAND_FAN = {
  gap: 0.09, // horizontal gap between hand cards in the strip
  yawDegPerStep: 1, // Y rotation per index step from hand center (Balatro fan)
} as const

export const HAND_MOTION = {
  jiggleDurationMs: 250,
  selectedPopZ: -0.67, // forward pop toward camera when selected
  selectedPopDurationMs: 120,
  selectedJiggleIntensity: 1.3,
} as const

/** Dev-only scene overlays — axis gizmo, bounds, etc. */
export const SCENE_DEBUG = {
  showAxisIndicator: import.meta.env.DEV,
} as const

export function playfieldCenter(): [number, number, number] {
  return [
    PLAYFIELD.leftX + PLAYFIELD.width / 2,
    TABLE.y,
    PLAYFIELD.frontZ - PLAYFIELD.depth / 2,
  ]
}

export const CAMERA = {
  fov: 36, // vertical field of view in degrees
  pitchDeg: 75, // camera tilt down toward the table; lower feels more seated
  distance: 20, // orbit distance from the look-at target
  near: 0.1, // near clipping plane
  far: 100, // far clipping plane
  target: [
    PLAYFIELD.leftX + PLAYFIELD.width * 0.5, // look-at X, centered on the hand strip
    TABLE.y, // look-at Y, table height
    PLAYFIELD.frontZ - PLAYFIELD.depth * 0.3, // look-at Z, forward on the table toward the player
  ] as [number, number, number],
  playerOffset: [
    0, // lateral offset from look-at X
    0, // vertical offset; negative lowers eye height
    0.85, // offset toward the player along +Z
  ] as [number, number, number],
} as const

export const LIGHTING = {
  ambientIntensity: 0.54, // fill light brightness
  directionalIntensity: 0.58, // key light brightness
  directionalPosition: [
    10, // key light X
    18, // key light Y
    8, // key light Z
  ] as [number, number, number],
  hemisphereIntensity: 0.2, // sky/ground bounce light brightness
} as const

export const SHADOW = {
  opacity: 0.16, // contact shadow strength on the playfield
  blur: 3.6, // contact shadow softness
  scale: Math.max(PLAYFIELD.width, PLAYFIELD.depth) * 1.06, // shadow plane size relative to playfield
} as const

export function cameraPitchRad(): number {
  return MathUtils.degToRad(CAMERA.pitchDeg)
}

export function handCardRotation(): [number, number, number] {
  return [-cameraPitchRad(), 0, 0]
}

export function handCardBaseY(): number {
  const pitchRad = cameraPitchRad()
  return TABLE.y + CARD.height * 0.5 * Math.cos(pitchRad) + HAND_ANCHOR.yLift
}

export function cameraPosition(): [number, number, number] {
  const pitchRad = cameraPitchRad()
  const [tx, ty, tz] = CAMERA.target
  const [ox, oy, oz] = CAMERA.playerOffset
  const horizontal = Math.cos(pitchRad) * CAMERA.distance
  const y = ty + Math.sin(pitchRad) * CAMERA.distance + oy
  const z = tz + horizontal + oz
  return [tx + ox, y, z]
}

export const PLAYFIELD_HALF_WIDTH = PLAYFIELD.width / 2 // half-width for shadow and bounds math
export const PLAYFIELD_HALF_DEPTH = PLAYFIELD.depth / 2 // half-depth for shadow and bounds math
