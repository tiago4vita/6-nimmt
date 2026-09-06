/** Scene semantic colors — mirror `frontend/src/style.css` :root tokens. */
export const SCENE_COLOR_TOKENS = {
  clear: '--color-scene-clear',
  shadow: '--color-scene-shadow',
  lightAmbient: '--color-scene-light-ambient',
  lightDirectional: '--color-scene-light-directional',
  lightHemisphereSky: '--color-scene-light-hemisphere-sky',
  lightHemisphereGround: '--color-scene-light-hemisphere-ground',
  accent: '--color-accent',
} as const

/** Fallbacks when CSS is unavailable (build / SSR). Must stay aligned with style.css. */
const SCENE_COLOR_FALLBACKS: Record<(typeof SCENE_COLOR_TOKENS)[keyof typeof SCENE_COLOR_TOKENS], string> = {
  [SCENE_COLOR_TOKENS.clear]: '#ffe7e0',
  [SCENE_COLOR_TOKENS.shadow]: '#7d3623',
  [SCENE_COLOR_TOKENS.lightAmbient]: '#ffe7e0',
  [SCENE_COLOR_TOKENS.lightDirectional]: '#ffe7e0',
  [SCENE_COLOR_TOKENS.lightHemisphereSky]: '#ffe7e0',
  [SCENE_COLOR_TOKENS.lightHemisphereGround]: '#c9a89e',
  [SCENE_COLOR_TOKENS.accent]: '#7d3623',
}

function resolveCssColor(raw: string): string {
  const value = raw.trim()
  if (!value.startsWith('var(')) {
    return value
  }
  const inner = value.slice(4, value.endsWith(')') ? -1 : undefined).trim()
  const nested = getComputedStyle(document.documentElement).getPropertyValue(inner).trim()
  return nested || value
}

export function readColorToken(
  token: (typeof SCENE_COLOR_TOKENS)[keyof typeof SCENE_COLOR_TOKENS],
): string {
  const fallback = SCENE_COLOR_FALLBACKS[token]
  if (typeof document === 'undefined') {
    return fallback
  }

  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return resolveCssColor(raw) || fallback
}

export interface SceneColors {
  clear: string
  shadow: string
  lightAmbient: string
  lightDirectional: string
  lightHemisphereSky: string
  lightHemisphereGround: string
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
    accent: readColorToken(SCENE_COLOR_TOKENS.accent),
  }
}

/** Parse `#rrggbb` design token for Three.js emissive / material color ints. */
export function hexTokenToNumber(token: string): number {
  return Number.parseInt(token.replace('#', ''), 16)
}
