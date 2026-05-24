<script setup lang="ts">
import { Copy, Link2 } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  roomId: string
  code: string
}>()

const { push } = useToast()

async function copy(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    push(`${label} copied`)
  } catch {
    push(`Could not copy ${label.toLowerCase()}`, 'error')
  }
}

function copyCode(): void {
  void copy(props.code, 'Room code')
}

function copyLink(): void {
  const url = `${window.location.origin}/?join=${props.code}`
  void copy(url, 'Invite link')
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:border-accent/40 hover:text-text"
      @click="copyCode"
    >
      <Copy class="size-4" aria-hidden="true" />
      Copy code
    </button>
    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted hover:border-accent/40 hover:text-text"
      @click="copyLink"
    >
      <Link2 class="size-4" aria-hidden="true" />
      Copy link
    </button>
  </div>
</template>
