<script setup lang="ts">
import DevModeToggle from '@/components/layout/DevModeToggle.vue'
import MobileDesktopNotice from '@/components/layout/MobileDesktopNotice.vue'
import SfxToggle from '@/components/layout/SfxToggle.vue'
import ToastHost from '@/components/feedback/ToastHost.vue'

withDefaults(
  defineProps<{
    mainAlign?: 'start' | 'center'
  }>(),
  { mainAlign: 'start' },
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface text-text">
    <MobileDesktopNotice />
    <header class="bg-header-bg text-header-text">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <RouterLink to="/" class="inline-flex items-center">
          <img src="/Logotype.svg" alt="BARE BONES" class="h-10 w-auto" />
        </RouterLink>
        <div class="flex items-center gap-1">
          <DevModeToggle />
          <SfxToggle />
        </div>
      </div>
    </header>
    <main
      class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6"
      :class="mainAlign === 'center' ? 'justify-center' : ''"
    >
      <slot />
    </main>
    <footer class="border-t border-border px-4 py-3">
      <p class="text-center text-xs font-normal text-muted">
        A game by Tiago Vita · 2026
      </p>
    </footer>
    <ToastHost />
  </div>
</template>
