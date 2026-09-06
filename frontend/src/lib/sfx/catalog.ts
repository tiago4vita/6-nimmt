import type { SfxCategory, SfxEvent } from './types'

export interface SfxCatalogEntry {
  srcs: readonly string[]
  volume: number
  category: SfxCategory
}

export const SFX_CATALOG: Record<SfxEvent, SfxCatalogEntry> = {
  'ui.click': {
    srcs: ['/sfx/ui/click-wood-1.wav', '/sfx/ui/click-wood-2.wav'],
    volume: 0.35,
    category: 'ui',
  },
  'card.select': {
    srcs: ['/sfx/card/whoosh-soft.wav'],
    volume: 0.45,
    category: 'card',
  },
  'card.submit': {
    srcs: ['/sfx/card/whoosh.wav'],
    volume: 0.55,
    category: 'card',
  },
  'game.win': {
    srcs: ['/sfx/game/win.wav'],
    volume: 0.6,
    category: 'game',
  },
  'game.lose': {
    srcs: ['/sfx/game/lose.wav'],
    volume: 0.6,
    category: 'game',
  },
}

export function resolveResultsEvent(
  winnerIds: readonly string[] | null | undefined,
  myPlayerId: string | null | undefined,
): Extract<SfxEvent, 'game.win' | 'game.lose'> | null {
  if (!myPlayerId || winnerIds == null) {
    return null
  }
  return winnerIds.includes(myPlayerId) ? 'game.win' : 'game.lose'
}
