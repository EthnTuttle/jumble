import { TDraftEvent } from '@/types'

export const RELAY_ACCESS_PENDING_KEY = 'jumble:pendingRelayAccess'

export const KIND_JOIN_REQUEST = 28934

export function buildAccessRequestEvent(operatorPubkey: string, note: string): TDraftEvent {
  return {
    kind: KIND_JOIN_REQUEST,
    content: note,
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', operatorPubkey]]
  }
}

export function getPendingAccessRequest(): {
  pubkey: string
  relayUrl: string
  requestedAt: number
} | null {
  try {
    const raw = localStorage.getItem(RELAY_ACCESS_PENDING_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setPendingAccessRequest(pubkey: string, relayUrl: string) {
  localStorage.setItem(
    RELAY_ACCESS_PENDING_KEY,
    JSON.stringify({ pubkey, relayUrl, requestedAt: Date.now() })
  )
}

export function clearPendingAccessRequest() {
  localStorage.removeItem(RELAY_ACCESS_PENDING_KEY)
}
