/** Zeroed jiggle sample — rest pose additive offsets. */
export interface JiggleSample {
  offsetX: number
  offsetY: number
  offsetZ: number
  rotX: number
  rotY: number
  rotZ: number
}

export const ZERO_JIGGLE: JiggleSample = {
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
}

/** Stable phase seed from a string id so each card wobbles slightly differently. */
export function jiggleSeedFromId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return (hash % 6283) / 1000
}

/**
 * Balatro-style damped wobble — sine envelope peaks mid-animation, settles at t=0 and t=1.
 * Returns additive offsets for position and rotation (radians).
 */
export function sampleCardJiggle(
  elapsedMs: number,
  durationMs: number,
  seed: number,
  intensity = 1,
): JiggleSample {
  const t = elapsedMs / durationMs
  if (t >= 1) {
    return ZERO_JIGGLE
  }

  // Bell envelope: 0 → peak → 0 over the duration
  const envelope = Math.sin(Math.PI * t)
  // Light decay so later oscillations feel tighter
  const damp = 1 - t * 0.3
  const wobble = envelope * damp * intensity

  return {
    offsetX: wobble * Math.sin(t * Math.PI * 1.5 + seed) * 0.012,
    offsetY: wobble * Math.sin(t * Math.PI * 1 + seed * 1.1) * 0.019,
    offsetZ: wobble * Math.sin(t * Math.PI * 1.5 + seed * 0.8) * 0.006,
    rotX: wobble * Math.sin(t * Math.PI * 1.5 + seed * 1.2) * 0.02,
    rotY: wobble * Math.sin(t * Math.PI * 1 + seed * 1.4) * 0.025,
    rotZ: wobble * Math.sin(t * Math.PI * 2 + seed * 1.6) * 0.03,
  }
}
