import { useLocalStorage } from '@vueuse/core'

export const DISPLAY_NAME_STORAGE_KEY = 'nimmt:displayName'

export function useDisplayName() {
  const displayName = useLocalStorage(DISPLAY_NAME_STORAGE_KEY, '')

  function rememberDisplayName(name: string): void {
    displayName.value = name.trim()
  }

  return {
    displayName,
    rememberDisplayName,
  }
}
