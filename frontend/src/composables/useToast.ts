import { ref } from 'vue'

export type ToastVariant = 'info' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastInput {
  message: string
  variant?: ToastVariant
  details?: string
  action?: ToastAction
  duration?: number | null
}

export interface ToastMessage {
  id: number
  message: string
  variant: ToastVariant
  details?: string
  action?: ToastAction
}

const toasts = ref<ToastMessage[]>([])
const DEFAULT_DURATION_MS = 5000
let nextId = 1

function pushToast(input: ToastInput | string, variant?: ToastVariant): number {
  const payload: ToastInput =
    typeof input === 'string'
      ? { message: input, variant: variant ?? 'info' }
      : { ...input, variant: input.variant ?? variant ?? 'info' }

  const id = nextId++
  toasts.value = [
    ...toasts.value,
    {
      id,
      message: payload.message,
      variant: payload.variant ?? 'info',
      details: payload.details,
      action: payload.action,
    },
  ]

  const duration =
    payload.duration === null
      ? null
      : payload.duration ?? DEFAULT_DURATION_MS
  if (duration !== null) {
    window.setTimeout(() => dismiss(id), duration)
  }
  return id
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

export function useToast() {
  return {
    toasts,
    push: pushToast,
    dismiss,
  }
}
