import { useSyncExternalStore } from 'react'

export const offlineMutationMessage =
  'A connection is required to change shared tasks. HomeTeam never queues task actions for later replay.'

export class OfflineMutationError extends Error {
  constructor() {
    super(offlineMutationMessage)
    this.name = 'OfflineMutationError'
  }
}

function onlineSnapshot() {
  return typeof navigator === 'undefined' || navigator.onLine
}

function subscribeToOnlineState(listener: () => void) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)

  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export function requireOnline() {
  if (!onlineSnapshot()) throw new OfflineMutationError()
}

export function useOnlineState() {
  return useSyncExternalStore(subscribeToOnlineState, onlineSnapshot, () => true)
}
