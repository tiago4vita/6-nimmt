<script setup lang="ts">
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { Volume2, VolumeX } from 'lucide-vue-next'

import IconButton from '@/components/layout/IconButton.vue'

const sfxEnabled = useLocalStorage('nimmt:sfxEnabled', false)

const icon = computed(() => (sfxEnabled.value ? Volume2 : VolumeX))
const label = computed(() =>
  sfxEnabled.value ? 'Sound effects on' : 'Sound effects off',
)
</script>

<template>
  <IconButton
    :icon="icon"
    :ariaLabel="label"
    :pressed="sfxEnabled"
    :title="label"
    @click="sfxEnabled = !sfxEnabled"
  />
</template>
