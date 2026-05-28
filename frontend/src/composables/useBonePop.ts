import { onBeforeUnmount, ref, type Ref } from 'vue'

export interface BonePopEntry {
  id: number
  playerId: string
  bones: number
  isYou: boolean
  stackIndex: number
}

const POP_DURATION_MS = 900

export function useBonePop(): {
  pops: Ref<BonePopEntry[]>
  triggerPop: (playerId: string, bones: number, myPlayerId: string | null) => void
  clearPops: () => void
} {
  const pops = ref<BonePopEntry[]>([])
  let nextId = 1
  const timers = new Set<number>()

  function triggerPop(
    playerId: string,
    bones: number,
    myPlayerId: string | null,
  ): void {
    if (bones <= 0) {
      return
    }

    const entry: BonePopEntry = {
      id: nextId++,
      playerId,
      bones,
      isYou: myPlayerId !== null && playerId === myPlayerId,
      stackIndex: pops.value.length,
    }

    pops.value = [...pops.value, entry]

    const timer = window.setTimeout(() => {
      pops.value = pops.value.filter((pop) => pop.id !== entry.id)
      timers.delete(timer)
    }, POP_DURATION_MS)
    timers.add(timer)
  }

  function clearPops(): void {
    for (const timer of timers) {
      window.clearTimeout(timer)
    }
    timers.clear()
    pops.value = []
  }

  onBeforeUnmount(clearPops)

  return { pops, triggerPop, clearPops }
}
