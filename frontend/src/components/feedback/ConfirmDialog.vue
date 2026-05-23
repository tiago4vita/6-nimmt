<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <div class="w-full max-w-md rounded-xl border border-border bg-surface-raised p-6 shadow-2xl">
      <h2 class="text-lg font-semibold text-text">{{ title }}</h2>
      <p class="mt-2 text-sm text-muted">{{ message }}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button
          type="button"
          class="rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-text"
          @click="emit('cancel')"
        >
          {{ cancelLabel ?? 'Cancel' }}
        </button>
        <button
          type="button"
          class="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>
