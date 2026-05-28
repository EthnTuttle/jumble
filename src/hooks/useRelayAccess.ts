import {
  COMMUNITY_RELAY_OPERATOR_PUBKEY,
  COMMUNITY_RELAYS,
  IS_COMMUNITY_MODE
} from '@/constants'
import {
  buildAccessRequestEvent,
  clearPendingAccessRequest,
  getPendingAccessRequest,
  setPendingAccessRequest
} from '@/lib/relay-access'
import { useNostr } from '@/providers/NostrProvider'
import client from '@/services/client.service'
import { kinds } from 'nostr-tools'
import { useEffect, useRef, useState } from 'react'

export type RelayAccessState = 'unknown' | 'allowed' | 'denied' | 'pending-request'

export function useRelayAccess() {
  const [state, setState] = useState<RelayAccessState>('unknown')
  const [isChecking, setIsChecking] = useState(false)
  const { pubkey, signEvent, signer } = useNostr()
  const communityRelayUrl = COMMUNITY_RELAYS?.[0]
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Subscribe to relay-access events from the client singleton
  useEffect(() => {
    const onDenied = () => {
      setState((prev) => (prev === 'pending-request' ? prev : 'denied'))
    }
    const onAllowed = () => {
      clearPendingAccessRequest()
      setState('allowed')
    }
    client.addEventListener('relay-access-denied', onDenied)
    client.addEventListener('relay-access-allowed', onAllowed)
    return () => {
      client.removeEventListener('relay-access-denied', onDenied)
      client.removeEventListener('relay-access-allowed', onAllowed)
    }
  }, [])

  // Trigger proactive check whenever the logged-in user or signer changes
  useEffect(() => {
    if (!IS_COMMUNITY_MODE || !pubkey || !communityRelayUrl) return

    // Restore pending state from localStorage
    const pending = getPendingAccessRequest()
    if (pending?.pubkey === pubkey && pending?.relayUrl === communityRelayUrl) {
      setState('pending-request')
      return
    }

    if (!signer) return

    // Proactive access check: delayed to ensure signer is fully initialized
    setState('unknown')
    checkTimerRef.current = setTimeout(() => checkAccess(), 2000)

    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    }
  }, [pubkey, signer]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAccess = async () => {
    if (!signer || !communityRelayUrl || !pubkey) return
    setIsChecking(true)
    try {
      // Publish a kind 10002 relay-list event — lightweight, replaceable, not shown in feeds
      const draft = {
        kind: kinds.RelayList,
        content: '',
        created_at: Math.floor(Date.now() / 1000),
        tags: [[communityRelayUrl, 'write']]
      }
      const event = await signEvent(draft)
      await client.publishEvent([communityRelayUrl], event)
      // Success path handled by 'relay-access-allowed' event handler
    } catch {
      // Failure path handled by 'relay-access-denied' event handler
    } finally {
      setIsChecking(false)
    }
  }

  const requestAccess = async (note: string) => {
    if (!signer || !communityRelayUrl || !pubkey) {
      throw new Error('Not logged in')
    }
    const draft = buildAccessRequestEvent(COMMUNITY_RELAY_OPERATOR_PUBKEY, note.trim())
    const event = await signEvent(draft)
    await client.publishEvent([communityRelayUrl], event)
    setPendingAccessRequest(pubkey, communityRelayUrl)
    setState('pending-request')
  }

  return { state, isChecking, checkAccess, requestAccess, communityRelayUrl }
}
