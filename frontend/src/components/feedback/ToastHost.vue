<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto rounded-lg border px-4 py-3 shadow-lg"
      :class="
        toast.variant === 'error'
          ? 'border-danger/40 bg-surface-raised text-danger'
          : 'border-border bg-surface-raised text-text'
      "
      :role="toast.variant === 'error' ? 'alert' : 'status'"
    >
      <div class="flex items-start justify-between gap-3">
        <p class="text-sm">{{ toast.message }}</p>
        <button
          type="button"
          class="text-muted hover:text-text"
          aria-label="Dismiss"
          @click="dismiss(toast.id)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>
