<script setup lang="ts">
import MobileDesktopNotice from '@/components/layout/MobileDesktopNotice.vue'
import SfxToggle from '@/components/layout/SfxToggle.vue'
import ToastHost from '@/components/feedback/ToastHost.vue'
</script>

<template>
  <div class="min-h-screen bg-surface text-text">
    <MobileDesktopNotice />
    <header class="border-b border-border bg-surface-raised/80 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="text-lg font-semibold tracking-tight text-text">
          6 Nimmt
        </RouterLink>
        <SfxToggle />
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-6">
      <slot />
    </main>
    <ToastHost />
  </div>
</template>
