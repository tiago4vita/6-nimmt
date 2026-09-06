<script setup lang="ts">
import { computed } from 'vue'
import { Bug, BugOff } from 'lucide-vue-next'

import IconButton from '@/components/layout/IconButton.vue'
import { useDevMode } from '@/composables/useDevMode'

const { devModeEnabled, canToggleDevMode } = useDevMode()

const icon = computed(() => (devModeEnabled.value ? Bug : BugOff))
const label = computed(() =>
  devModeEnabled.value ? 'Dev mode on' : 'Dev mode off',
)
</script>

<template>
  <IconButton
    v-if="canToggleDevMode"
    :icon="icon"
    :ariaLabel="label"
    :pressed="devModeEnabled"
    :title="`${label} — axis gizmo, motion queue`"
    variant="header"
    @click="devModeEnabled = !devModeEnabled"
  />
</template>
