<script setup lang="ts">
import type { SubmissionProgress } from '@/graphql/types'

defineProps<{
  progress: SubmissionProgress | null
}>()
</script>

<template>
  <div v-if="progress" class="rounded-md border border-border bg-surface-raised px-4 py-3">
    <div class="flex items-center justify-between text-sm">
      <span class="text-muted">Submissions</span>
      <span class="font-medium text-text">{{ progress.submitted }} / {{ progress.required }}</span>
    </div>
    <div class="mt-2 h-2 overflow-hidden rounded-full bg-surface">
      <div
        class="h-full rounded-full bg-accent transition-all duration-300"
        :style="{ width: `${(progress.submitted / Math.max(progress.required, 1)) * 100}%` }"
      />
    </div>
  </div>
</template>
