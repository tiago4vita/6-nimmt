/** Scene semantic colors — mirror `frontend/src/style.css` :root tokens. */
export const SCENE_COLOR_TOKENS = {
  clear: '--color-scene-clear',
  shadow: '--color-scene-shadow',
  lightAmbient: '--color-scene-light-ambient',
  lightDirectional: '--color-scene-light-directional',
  lightHemisphereSky: '--color-scene-light-hemisphere-sky',
  lightHemisphereGround: '--color-scene-light-hemisphere-ground',
  accentWarm: '--color-accent-warm',
  accent: '--color-accent',
} as const

/** Fallbacks when CSS is unavailable (build / SSR). Must stay aligned with style.css. */
const SCENE_COLOR_FALLBACKS: Record<(typeof SCENE_COLOR_TOKENS)[keyof typeof SCENE_COLOR_TOKENS], string> = {
  [SCENE_COLOR_TOKENS.clear]: '#f2f0eb',
  [SCENE_COLOR_TOKENS.shadow]: '#d4d0c8',
  [SCENE_COLOR_TOKENS.lightAmbient]: '#ffffff',
  [SCENE_COLOR_TOKENS.lightDirectional]: '#ffffff',
  [SCENE_COLOR_TOKENS.lightHemisphereSky]: '#ffffff',
  [SCENE_COLOR_TOKENS.lightHemisphereGround]: '#d4d0c8',
  [SCENE_COLOR_TOKENS.accentWarm]: '#e85d04',
  [SCENE_COLOR_TOKENS.accent]: '#0099cc',
}

export function readColorToken(
  token: (typeof SCENE_COLOR_TOKENS)[keyof typeof SCENE_COLOR_TOKENS],
): string {
  const fallback = SCENE_COLOR_FALLBACKS[token]
  if (typeof document === 'undefined') {
    return fallback
  }

  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return raw || fallback
}

export interface SceneColors {
  clear: string
  shadow: string
  lightAmbient: string
  lightDirectional: string
  lightHemisphereSky: string
  lightHemisphereGround: string
  accentWarm: string
  accent: string
}

export function readSceneColors(): SceneColors {
  return {
    clear: readColorToken(SCENE_COLOR_TOKENS.clear),
    shadow: readColorToken(SCENE_COLOR_TOKENS.shadow),
    lightAmbient: readColorToken(SCENE_COLOR_TOKENS.lightAmbient),
    lightDirectional: readColorToken(SCENE_COLOR_TOKENS.lightDirectional),
    lightHemisphereSky: readColorToken(SCENE_COLOR_TOKENS.lightHemisphereSky),
    lightHemisphereGround: readColorToken(SCENE_COLOR_TOKENS.lightHemisphereGround),
    accentWarm: readColorToken(SCENE_COLOR_TOKENS.accentWarm),
    accent: readColorToken(SCENE_COLOR_TOKENS.accent),
  }
}

/** Parse `#rrggbb` design token for Three.js emissive / material color ints. */
export function hexTokenToNumber(token: string): number {
  return Number.parseInt(token.replace('#', ''), 16)
}
