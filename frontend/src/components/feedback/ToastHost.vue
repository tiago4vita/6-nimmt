<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
const expanded = ref<Set<number>>(new Set())

function toggleDetails(id: number): void {
  const next = new Set(expanded.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expanded.value = next
}

function runAction(toast: { id: number; action?: { onClick: () => void } }): void {
  toast.action?.onClick()
  dismiss(toast.id)
}
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

      <div
        v-if="toast.details || toast.action"
        class="mt-2 flex flex-wrap items-center gap-3 text-xs"
      >
        <button
          v-if="toast.action"
          type="button"
          class="rounded-md border border-accent/40 px-2 py-1 font-medium text-accent transition hover:bg-accent/10"
          @click="runAction(toast)"
        >
          {{ toast.action.label }}
        </button>
        <button
          v-if="toast.details"
          type="button"
          class="inline-flex items-center gap-1 text-muted hover:text-text"
          :aria-expanded="expanded.has(toast.id)"
          @click="toggleDetails(toast.id)"
        >
          <ChevronUp v-if="expanded.has(toast.id)" class="size-3" aria-hidden="true" />
          <ChevronDown v-else class="size-3" aria-hidden="true" />
          More details
        </button>
      </div>

      <pre
        v-if="toast.details && expanded.has(toast.id)"
        class="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-surface px-2 py-1 text-[11px] text-muted"
      >{{ toast.details }}</pre>
    </div>
  </div>
</template>
