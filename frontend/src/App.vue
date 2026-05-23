<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'

import { useGuestSession } from '@/composables/useGuestSession'

const { ensureSession } = useGuestSession()

onMounted(() => {
  void ensureSession()
})
</script>

<template>
  <RouterView />
</template>
