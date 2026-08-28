import { useMemo, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useOnlineState } from './onlineState'
import { PwaContext, type PwaStatus } from './pwaContext'

export function PwaProvider({ children }: Readonly<{ children: ReactNode }>) {
  const isOnline = useOnlineState()
  const [offlineReady, setOfflineReady] = useState(false)
  const [needsUpdate, setNeedsUpdate] = useState(false)
  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onOfflineReady: () => setOfflineReady(true),
    onNeedRefresh: () => setNeedsUpdate(true),
  })

  const value = useMemo<PwaStatus>(() => ({
    applyUpdate: async () => {
      await updateServiceWorker(true)
    },
    dismissOfflineReady: () => setOfflineReady(false),
    dismissUpdate: () => setNeedsUpdate(false),
    isOfflineReady: offlineReady,
    isOnline,
    needsUpdate,
  }), [isOnline, needsUpdate, offlineReady, updateServiceWorker])

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}
