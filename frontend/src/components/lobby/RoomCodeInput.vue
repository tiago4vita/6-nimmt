<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  complete: [code: string]
}>()

const cells = ref<string[]>(Array.from({ length: 6 }, () => ''))
const inputRefs = ref<(HTMLInputElement | null)[]>([])

const code = computed(() => cells.value.join('').toUpperCase())

watch(
  () => props.modelValue,
  (value) => {
    const normalized = value.toUpperCase().slice(0, 6)
    cells.value = Array.from({ length: 6 }, (_, index) => normalized[index] ?? '')
  },
  { immediate: true },
)

watch(code, (value) => {
  emit('update:modelValue', value)
  if (value.length === 6) {
    emit('complete', value)
  }
})

function onInput(index: number, event: Event): void {
  const target = event.target as HTMLInputElement
  const char = target.value.slice(-1).toUpperCase().replace(/[^A-Z0-9]/g, '')
  cells.value[index] = char
  target.value = char

  if (char && index < 5) {
    inputRefs.value[index + 1]?.focus()
  }
}

function onKeydown(index: number, event: KeyboardEvent): void {
  if (event.key === 'Backspace' && !cells.value[index] && index > 0) {
    inputRefs.value[index - 1]?.focus()
  }
}

function onPaste(event: ClipboardEvent): void {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text') ?? ''
  emit('update:modelValue', pasted.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
}
</script>

<template>
  <div class="flex justify-center gap-2" @paste="onPaste">
    <input
      v-for="(_, index) in cells"
      :key="index"
      :ref="(element) => (inputRefs[index] = element as HTMLInputElement | null)"
      :value="cells[index]"
      type="text"
      maxlength="1"
      inputmode="text"
      autocapitalize="characters"
      class="h-12 w-10 rounded-md border border-border bg-surface text-center text-lg font-semibold uppercase text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
      :aria-label="`Room code character ${index + 1}`"
      @input="onInput(index, $event)"
      @keydown="onKeydown(index, $event)"
    />
  </div>
</template>
