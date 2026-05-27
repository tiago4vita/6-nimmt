/** CSS custom properties for card face/back colors — mirrored in `style.css`. */
export const CARD_COLOR_TOKENS = {
  back: '--color-card-back',
  edge: '--color-card-edge',
  faceText: '--color-card-face-text',
  faceShadow: '--color-card-face-shadow',
  boneMarker: '--color-card-bone-marker',
  bandVioletFrom: '--color-card-band-violet-from',
  bandVioletTo: '--color-card-band-violet-to',
  bandTealFrom: '--color-card-band-teal-from',
  bandTealTo: '--color-card-band-teal-to',
  bandAmberFrom: '--color-card-band-amber-from',
  bandAmberTo: '--color-card-band-amber-to',
  bandRoseFrom: '--color-card-band-rose-from',
  bandRoseTo: '--color-card-band-rose-to',
} as const

const CARD_COLOR_FALLBACKS: Record<
  (typeof CARD_COLOR_TOKENS)[keyof typeof CARD_COLOR_TOKENS],
  string
> = {
  [CARD_COLOR_TOKENS.back]: '#4a4a4a',
  [CARD_COLOR_TOKENS.edge]: '#3a3a3a',
  [CARD_COLOR_TOKENS.faceText]: '#ffffff',
  [CARD_COLOR_TOKENS.faceShadow]: 'rgba(0, 0, 0, 0.35)',
  [CARD_COLOR_TOKENS.boneMarker]: 'rgba(255, 255, 255, 0.88)',
  [CARD_COLOR_TOKENS.bandVioletFrom]: '#6366f1',
  [CARD_COLOR_TOKENS.bandVioletTo]: '#7c3aed',
  [CARD_COLOR_TOKENS.bandTealFrom]: '#14b8a6',
  [CARD_COLOR_TOKENS.bandTealTo]: '#059669',
  [CARD_COLOR_TOKENS.bandAmberFrom]: '#f59e0b',
  [CARD_COLOR_TOKENS.bandAmberTo]: '#ea580c',
  [CARD_COLOR_TOKENS.bandRoseFrom]: '#f43f5e',
  [CARD_COLOR_TOKENS.bandRoseTo]: '#dc2626',
}

export interface CardHueBand {
  from: string
  to: string
}

export interface CardFaceColors {
  back: string
  edge: string
  faceText: string
  faceShadow: string
  boneMarker: string
}

function readToken(token: (typeof CARD_COLOR_TOKENS)[keyof typeof CARD_COLOR_TOKENS]): string {
  const fallback = CARD_COLOR_FALLBACKS[token]
  if (typeof document === 'undefined') {
    return fallback
  }
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return raw || fallback
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

const HUE_BANDS: { max: number; from: keyof typeof CARD_COLOR_TOKENS; to: keyof typeof CARD_COLOR_TOKENS }[] = [
  { max: 26, from: 'bandVioletFrom', to: 'bandVioletTo' },
  { max: 52, from: 'bandTealFrom', to: 'bandTealTo' },
  { max: 78, from: 'bandAmberFrom', to: 'bandAmberTo' },
  { max: Number.POSITIVE_INFINITY, from: 'bandRoseFrom', to: 'bandRoseTo' },
]

export function hueBandForValue(value: number): CardHueBand {
  const band = HUE_BANDS.find((entry) => value <= entry.max)!
  return {
    from: readToken(CARD_COLOR_TOKENS[band.from]),
    to: readToken(CARD_COLOR_TOKENS[band.to]),
  }
}

/** Tailwind-compatible gradient class tokens for 2D CardTile. */
export function cardTileGradientClass(value: number): string {
  if (value <= 26) {
    return 'from-[var(--color-card-band-violet-from)] to-[var(--color-card-band-violet-to)]'
  }
  if (value <= 52) {
    return 'from-[var(--color-card-band-teal-from)] to-[var(--color-card-band-teal-to)]'
  }
  if (value <= 78) {
    return 'from-[var(--color-card-band-amber-from)] to-[var(--color-card-band-amber-to)]'
  }
  return 'from-[var(--color-card-band-rose-from)] to-[var(--color-card-band-rose-to)]'
}
