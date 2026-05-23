<script setup lang="ts">
import { computed, type Component } from 'vue'

const props = withDefaults(
  defineProps<{
    icon: Component
    ariaLabel: string
    pressed?: boolean | null
    disabled?: boolean
    variant?: 'ghost' | 'danger' | 'accent'
    size?: 'sm' | 'md'
    title?: string
    type?: 'button' | 'submit'
  }>(),
  {
    pressed: null,
    disabled: false,
    variant: 'ghost',
    size: 'md',
    title: undefined,
    type: 'button',
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const sizeClass = computed(() =>
  props.size === 'sm' ? 'size-8 [&_svg]:size-4' : 'size-9 [&_svg]:size-4',
)

const variantClass = computed(() => {
  switch (props.variant) {
    case 'danger':
      return 'text-danger hover:bg-danger/10'
    case 'accent':
      return 'text-accent hover:bg-accent/10'
    default:
      return 'text-muted hover:text-text hover:bg-surface'
  }
})

const tooltip = computed(() => props.title ?? props.ariaLabel)

function onClick(event: MouseEvent): void {
  if (props.disabled) {
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    :aria-label="ariaLabel"
    :aria-pressed="pressed === null ? undefined : pressed"
    :aria-disabled="disabled"
    :disabled="disabled"
    :title="tooltip"
    class="inline-flex items-center justify-center rounded-md border border-border bg-surface-raised transition outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
    :class="[sizeClass, variantClass]"
    @click="onClick"
  >
    <component :is="icon" aria-hidden="true" />
  </button>
</template>
