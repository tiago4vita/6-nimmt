<script setup lang="ts">
import { computed } from 'vue'
import { Volume2, VolumeX } from 'lucide-vue-next'

import IconButton from '@/components/layout/IconButton.vue'
import { useSfx } from '@/composables/useSfx'

const { enabled, unlock, play } = useSfx()

const icon = computed(() => (enabled.value ? Volume2 : VolumeX))
const label = computed(() =>
  enabled.value ? 'Sound effects on' : 'Sound effects off',
)

function toggle(): void {
  enabled.value = !enabled.value
  if (enabled.value) {
    unlock()
    play('ui.click')
  }
}
</script>

<template>
  <IconButton
    :icon="icon"
    :ariaLabel="label"
    :pressed="enabled"
    :title="label"
    variant="header"
    @click="toggle"
  />
</template>
