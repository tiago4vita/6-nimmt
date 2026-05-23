import { onBeforeUnmount, onMounted, type Ref } from 'vue'

import type { GamePhase } from '@/graphql/types'

interface UseGameShortcutsOptions {
  phase: Ref<GamePhase | null>
  isHandLocked: Ref<boolean>
  hasSelection: Ref<boolean>
  hasOpenDialog: Ref<boolean>
  selectByIndex: (index: number) => void
  confirmSelection: () => void
  clearSelection: () => void
  openLeaveConfirm: () => void
}

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

function isFromEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (TYPING_TAGS.has(target.tagName)) {
    return true
  }
  if (target.isContentEditable) {
    return true
  }
  return false
}

export function useGameShortcuts(options: UseGameShortcutsOptions): void {
  const {
    phase,
    isHandLocked,
    hasSelection,
    hasOpenDialog,
    selectByIndex,
    confirmSelection,
    clearSelection,
    openLeaveConfirm,
  } = options

  function handler(event: KeyboardEvent): void {
    if (event.defaultPrevented) {
      return
    }
    if (isFromEditable(event.target)) {
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return
    }

    if (hasOpenDialog.value) {
      return
    }

    if (phase.value === 'SUBMIT' && /^[1-9]$/.test(event.key)) {
      if (isHandLocked.value) {
        return
      }
      event.preventDefault()
      selectByIndex(Number.parseInt(event.key, 10) - 1)
      return
    }

    if (event.key === 'Enter') {
      if (hasSelection.value) {
        event.preventDefault()
        confirmSelection()
      }
      return
    }

    if (event.key === 'Escape') {
      if (hasSelection.value) {
        event.preventDefault()
        clearSelection()
        return
      }
      event.preventDefault()
      openLeaveConfirm()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handler)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handler)
  })
}
