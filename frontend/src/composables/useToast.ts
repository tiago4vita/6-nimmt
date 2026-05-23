import { ref } from 'vue'

export interface ToastMessage {
  id: number
  message: string
  variant: 'info' | 'error'
}

const toasts = ref<ToastMessage[]>([])
let nextId = 1

export function useToast() {
  function push(message: string, variant: ToastMessage['variant'] = 'info'): void {
    const id = nextId++
    toasts.value = [...toasts.value, { id, message, variant }]
    window.setTimeout(() => dismiss(id), 5000)
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    toasts,
    push,
    dismiss,
  }
}
