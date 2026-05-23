<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
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

const cancelRef = ref<HTMLButtonElement | null>(null)
const confirmRef = ref<HTMLButtonElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

function focusables(): HTMLElement[] {
  return [cancelRef.value, confirmRef.value].filter(
    (el): el is HTMLButtonElement => el !== null,
  )
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) {
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('confirm')
    return
  }
  if (event.key === 'Tab') {
    const elements = focusables()
    if (elements.length === 0) {
      return
    }
    const active = document.activeElement as HTMLElement | null
    const currentIndex = elements.indexOf(active as HTMLElement)
    const direction = event.shiftKey ? -1 : 1
    const nextIndex =
      (currentIndex + direction + elements.length) % elements.length
    event.preventDefault()
    elements[nextIndex]?.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      window.addEventListener('keydown', onKeydown)
      await nextTick()
      cancelRef.value?.focus()
    } else {
      window.removeEventListener('keydown', onKeydown)
      previousFocus?.focus?.()
      previousFocus = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="open"
    ref="containerRef"
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
          ref="cancelRef"
          type="button"
          class="btn btn-secondary"
          @click="emit('cancel')"
        >
          {{ cancelLabel ?? 'Cancel' }}
        </button>
        <button
          ref="confirmRef"
          type="button"
          class="btn btn-destructive"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>
