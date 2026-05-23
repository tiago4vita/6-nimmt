export const GUEST_SESSION_STORAGE_KEY = '6nimmt_guest'

export interface GuestSessionStorage {
  guestId: string
  sessionToken: string
  expiresAt: string
}

export function readGuestSession(): GuestSessionStorage | null {
  const raw = localStorage.getItem(GUEST_SESSION_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GuestSessionStorage>
    if (
      typeof parsed.guestId !== 'string' ||
      typeof parsed.sessionToken !== 'string' ||
      typeof parsed.expiresAt !== 'string'
    ) {
      return null
    }
    return {
      guestId: parsed.guestId,
      sessionToken: parsed.sessionToken,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

export function getAuthHeaders(): Record<string, string> {
  const session = readGuestSession()
  if (!session) {
    return {}
  }

  return {
    authorization: `Bearer ${session.sessionToken}`,
    'X-Guest-Id': session.guestId,
  }
}
