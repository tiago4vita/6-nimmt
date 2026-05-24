import { ref } from 'vue'

/** True when graphql-ws socket is open. */
export const wsConnected = ref(false)

/** True after first connect when the socket drops and has not re-opened yet. */
export const wsReconnecting = ref(false)

let hasConnectedOnce = false
const reconnectListeners = new Set<() => void>()

export function onWsReconnected(listener: () => void): () => void {
  reconnectListeners.add(listener)
  return () => {
    reconnectListeners.delete(listener)
  }
}

export function handleWsConnected(): void {
  const wasReconnecting = wsReconnecting.value
  wsConnected.value = true
  wsReconnecting.value = false

  if (hasConnectedOnce && wasReconnecting) {
    reconnectListeners.forEach((listener) => listener())
  }

  hasConnectedOnce = true
}

export function handleWsClosed(): void {
  wsConnected.value = false
  if (hasConnectedOnce) {
    wsReconnecting.value = true
  }
}

export function handleWsError(): void {
  wsConnected.value = false
  if (hasConnectedOnce) {
    wsReconnecting.value = true
  }
}
