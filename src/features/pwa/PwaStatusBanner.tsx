import { Button } from '../../components/ui/Button'
import { usePwaStatus } from './pwaContext'
import { offlineMutationMessage } from './onlineState'

export function PwaStatusBanner() {
  const status = usePwaStatus()

  if (!status.isOnline) {
    return (
      <aside className="border-b border-warning/25 bg-warning/10 px-5 py-3 text-sm text-ink" role="status">
        <strong>You’re offline.</strong> {offlineMutationMessage}
      </aside>
    )
  }

  if (status.needsUpdate) {
    return (
      <aside className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/25 bg-brand-soft px-5 py-3 text-sm" role="status">
        <span><strong>A HomeTeam update is ready.</strong> Refresh to use the latest version.</span>
        <span className="flex gap-2">
          <Button onClick={() => void status.applyUpdate()}>Refresh</Button>
          <Button onClick={status.dismissUpdate} variant="secondary">Later</Button>
        </span>
      </aside>
    )
  }

  if (status.isOfflineReady) {
    return (
      <aside className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3 text-sm" role="status">
        <span>The HomeTeam app shell is ready for offline viewing.</span>
        <Button onClick={status.dismissOfflineReady} variant="secondary">Dismiss</Button>
      </aside>
    )
  }

  return null
}
