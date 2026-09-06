import { computed, type ComputedRef, type Ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const devModeEnabled = useLocalStorage('nimmt:devMode', false)

export function useDevMode(): {
  devModeEnabled: Ref<boolean>
  canToggleDevMode: ComputedRef<boolean>
} {
  return {
    devModeEnabled,
    canToggleDevMode: computed(() => import.meta.env.DEV),
  }
}
