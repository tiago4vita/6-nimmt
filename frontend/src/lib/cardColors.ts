/** CSS custom properties for card face/back colors — mirrored in `style.css`. */
export const CARD_COLOR_TOKENS = {
  back: '--color-card-back',
  edge: '--color-card-edge',
  faceText: '--color-card-face-text',
  faceShadow: '--color-card-face-shadow',
  boneMarker: '--color-card-bone-marker',
  tier7: '--color-card-tier-7',
  tier5: '--color-card-tier-5',
  tier3: '--color-card-tier-3',
  tier2: '--color-card-tier-2',
  tier1: '--color-card-tier-1',
} as const

const CARD_COLOR_FALLBACKS: Record<
  (typeof CARD_COLOR_TOKENS)[keyof typeof CARD_COLOR_TOKENS],
  string
> = {
  [CARD_COLOR_TOKENS.back]: '#7d3623',
  [CARD_COLOR_TOKENS.edge]: '#7d3623',
  [CARD_COLOR_TOKENS.faceText]: '#ffe7e0',
  [CARD_COLOR_TOKENS.faceShadow]: 'rgba(125, 54, 35, 0.35)',
  [CARD_COLOR_TOKENS.boneMarker]: '#ffe7e0',
  [CARD_COLOR_TOKENS.tier7]: '#7d3623',
  [CARD_COLOR_TOKENS.tier5]: '#3f237d',
  [CARD_COLOR_TOKENS.tier3]: '#237d62',
  [CARD_COLOR_TOKENS.tier2]: '#7d7723',
  [CARD_COLOR_TOKENS.tier1]: '#d29281',
}

export interface CardFaceColors {
  back: string
  edge: string
  faceText: string
  faceShadow: string
  boneMarker: string
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

function readToken(token: (typeof CARD_COLOR_TOKENS)[keyof typeof CARD_COLOR_TOKENS]): string {
  const fallback = CARD_COLOR_FALLBACKS[token]
  if (typeof document === 'undefined') {
    return fallback
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return resolveCssColor(raw) || fallback
}

export function readCardFaceColors(): CardFaceColors {
  return {
    back: readToken(CARD_COLOR_TOKENS.back),
    edge: readToken(CARD_COLOR_TOKENS.edge),
    faceText: readToken(CARD_COLOR_TOKENS.faceText),
    faceShadow: readToken(CARD_COLOR_TOKENS.faceShadow),
    boneMarker: readToken(CARD_COLOR_TOKENS.boneMarker),
  }
}

/** Flat face fill from bone count — 7 / 5 / 3 / 2 / default 1. */
export function boneTierColor(bones: number): string {
  switch (bones) {
    case 7:
      return readToken(CARD_COLOR_TOKENS.tier7)
    case 5:
      return readToken(CARD_COLOR_TOKENS.tier5)
    case 3:
      return readToken(CARD_COLOR_TOKENS.tier3)
    case 2:
      return readToken(CARD_COLOR_TOKENS.tier2)
    default:
      return readToken(CARD_COLOR_TOKENS.tier1)
  }
}

/** Tailwind background utility for 2D CardTile. */
export function cardTileTierClass(bones: number): string {
  switch (bones) {
    case 7:
      return 'bg-card-tier-7'
    case 5:
      return 'bg-card-tier-5'
    case 3:
      return 'bg-card-tier-3'
    case 2:
      return 'bg-card-tier-2'
    default:
      return 'bg-card-tier-1'
  }
}
