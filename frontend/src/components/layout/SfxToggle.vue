<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { Volume2, VolumeX } from 'lucide-vue-next'

const sfxEnabled = useLocalStorage('nimmt:sfxEnabled', false)
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted transition hover:border-accent/40 hover:text-text"
    :aria-pressed="sfxEnabled"
    @click="sfxEnabled = !sfxEnabled"
  >
    <Volume2 v-if="sfxEnabled" class="size-4" aria-hidden="true" />
    <VolumeX v-else class="size-4" aria-hidden="true" />
    SFX {{ sfxEnabled ? 'on' : 'off' }}
  </button>
</template>
