import { watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

import { resolveResultsEvent } from '@/lib/sfx/catalog'
import { sfxEngine } from '@/lib/sfx/engine'
import type { SfxEvent } from '@/lib/sfx/types'

export const SFX_ENABLED_KEY = 'nimmt:sfxEnabled'

const enabled = useLocalStorage(SFX_ENABLED_KEY, false)

watch(
  enabled,
  (on) => {
    if (!on) {
      sfxEngine.stopAll()
    }
  },
  { flush: 'sync' },
)

export function useSfx() {
  function unlock(): void {
    sfxEngine.unlock()
  }

  function play(event: SfxEvent): void {
    void sfxEngine.play(event, enabled.value)
  }

  function playResults(
    winnerIds: readonly string[] | null | undefined,
    myPlayerId: string | null | undefined,
  ): void {
    const event = resolveResultsEvent(winnerIds, myPlayerId)
    if (event) {
      play(event)
    }
  }

  function setEnabled(next: boolean): void {
    enabled.value = next
    if (next) {
      unlock()
      play('ui.click')
      return
    }
    sfxEngine.stopAll()
  }

  return {
    enabled,
    play,
    playResults,
    unlock,
    setEnabled,
  }
}
