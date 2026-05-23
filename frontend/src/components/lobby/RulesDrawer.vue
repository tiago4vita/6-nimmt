<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'

const open = ref(false)
</script>

<template>
  <div class="rounded-lg border border-border bg-surface-raised">
    <button
      type="button"
      class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-text"
      :aria-expanded="open"
      @click="open = !open"
    >
      How to play
      <ChevronUp v-if="open" class="size-4 text-muted" aria-hidden="true" />
      <ChevronDown v-else class="size-4 text-muted" aria-hidden="true" />
    </button>
    <div v-if="open" class="space-y-2 border-t border-border px-4 py-3 text-sm text-muted">
      <p>Each round, pick one card from your hand to play onto the row with the closest higher card.</p>
      <p>If your card is too low for every row, you choose the row where you take the fewest bones.</p>
      <p>
        Rule C (v1): if you cannot place normally, the game auto-picks the least-penalty row for you.
      </p>
    </div>
  </div>
</template>
