import { createContext, useContext } from 'react'

export type PwaStatus = Readonly<{
  applyUpdate: () => Promise<void>
  dismissOfflineReady: () => void
  dismissUpdate: () => void
  isOfflineReady: boolean
  isOnline: boolean
  needsUpdate: boolean
}>

const defaultPwaStatus: PwaStatus = {
  applyUpdate: () => Promise.resolve(),
  dismissOfflineReady: () => undefined,
  dismissUpdate: () => undefined,
  isOfflineReady: false,
  isOnline: true,
  needsUpdate: false,
}

export const PwaContext = createContext<PwaStatus>(defaultPwaStatus)

export function usePwaStatus() {
  return useContext(PwaContext)
}
