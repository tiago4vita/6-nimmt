<script setup lang="ts">
withDefaults(
  defineProps<{
    variant: 'home' | 'lobby' | 'game'
    label?: string
  }>(),
  { label: 'Loading\u2026' },
)
</script>

<template>
  <div
    class="motion-safe:animate-pulse"
    role="status"
    :aria-label="label"
  >
    <template v-if="variant === 'home'">
      <div class="mx-auto flex max-w-md flex-col gap-4">
        <div class="h-6 w-32 rounded-md bg-dark/10" />
        <div class="h-12 rounded-md bg-dark/10" />
        <div class="h-10 rounded-md bg-dark/10" />
        <div class="grid grid-cols-6 gap-2">
          <div
            v-for="n in 6"
            :key="n"
            class="h-12 rounded-md bg-dark/10"
          />
        </div>
        <div class="h-10 rounded-md bg-dark/10" />
      </div>
    </template>

    <template v-else-if="variant === 'lobby'">
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3">
          <div class="h-5 w-24 rounded-md bg-dark/10" />
          <div
            v-for="n in 4"
            :key="n"
            class="h-12 rounded-md bg-dark/10"
          />
        </div>
        <div class="space-y-3">
          <div class="h-5 w-32 rounded-md bg-dark/10" />
          <div class="h-32 rounded-md bg-dark/10" />
          <div class="h-10 rounded-md bg-dark/10" />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="h-9 w-32 rounded-md bg-dark/10" />
          <div class="size-14 rounded-full bg-dark/10" />
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="n in 4"
            :key="n"
            class="h-16 rounded-md bg-dark/10"
          />
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <div
            v-for="n in 4"
            :key="n"
            class="mb-2 h-12 rounded-md bg-dark/10"
          />
        </div>
        <div class="rounded-xl border border-border bg-surface p-4">
          <div class="flex justify-center gap-2">
            <div
              v-for="n in 6"
              :key="n"
              class="h-20 w-14 rounded-md bg-dark/10"
            />
          </div>
        </div>
      </div>
    </template>

    <span class="sr-only">{{ label }}</span>
  </div>
</template>
