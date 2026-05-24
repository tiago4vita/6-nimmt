import { computed, ref } from 'vue'

import { urqlClient } from '@/graphql/client'
import { ENSURE_GUEST_SESSION } from '@/graphql/operations'
import type { GuestSession } from '@/graphql/types'
import {
  isGuestSessionExpired,
  readGuestSession,
  writeGuestSession,
  type GuestSessionStorage,
} from '@/lib/guest-session'

const session = ref<GuestSessionStorage | null>(readGuestSession())
const isReady = ref(false)
const isLoading = ref(false)
let bootstrapPromise: Promise<void> | null = null

function persistSession(payload: GuestSession): GuestSessionStorage {
  const stored: GuestSessionStorage = {
    guestId: payload.guestId,
    sessionToken: payload.sessionToken,
    expiresAt: payload.expiresAt,
  }
  writeGuestSession(stored)
  session.value = stored
  return stored
}

async function fetchGuestSession(): Promise<void> {
  const result = await urqlClient.query(ENSURE_GUEST_SESSION, {}).toPromise()
  if (result.error) {
    throw result.error
  }

  const payload = result.data?.ensureGuestSession as GuestSession | undefined
  if (!payload) {
    throw new Error('ensureGuestSession returned no data')
  }

  persistSession(payload)
}

export function useGuestSession() {
  const guestId = computed(() => session.value?.guestId ?? null)
  const sessionToken = computed(() => session.value?.sessionToken ?? null)

  async function refreshSession(): Promise<void> {
    await fetchGuestSession()
    isReady.value = true
  }

  async function ensureSession(): Promise<void> {
    if (isReady.value) {
      return
    }

    if (bootstrapPromise) {
      await bootstrapPromise
      return
    }

    bootstrapPromise = (async () => {
      isLoading.value = true
      try {
        const existing = readGuestSession()
        if (existing && !isGuestSessionExpired(existing)) {
          session.value = existing
          isReady.value = true
          return
        }

        await refreshSession()
      } finally {
        isLoading.value = false
      }
    })()

    await bootstrapPromise
  }

  return {
    session,
    guestId,
    sessionToken,
    isReady,
    isLoading,
    ensureSession,
    refreshSession,
  }
}
