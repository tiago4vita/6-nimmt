<script setup lang="ts">
import { Monitor } from 'lucide-vue-next'
</script>

<template>
  <div
    class="border-b border-border bg-surface-raised px-4 py-2 text-sm text-muted lg:hidden"
    role="status"
  >
    <div class="mx-auto flex max-w-6xl items-center gap-2">
      <Monitor class="size-4 shrink-0 text-accent" aria-hidden="true" />
      <p>
        BARE BONES is designed for desktop. You can browse, but gameplay works best on a larger
        screen.
      </p>
    </div>
  </div>
</template>
