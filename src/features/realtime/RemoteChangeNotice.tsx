import { useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { RemoteChangeContext, type RemoteChangeContextValue } from './remoteChangeContext'

export function RemoteChangeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [changedOccurrenceIds, setChangedOccurrenceIds] = useState<readonly string[]>([])
  const dismissOccurrenceChange = useCallback((occurrenceId: string) => setChangedOccurrenceIds((ids) => ids.filter((id) => id !== occurrenceId)), [])
  const noteOccurrenceChange = useCallback((occurrenceId: string) => setChangedOccurrenceIds((ids) => ids.includes(occurrenceId) ? ids : [...ids, occurrenceId]), [])
  const value = useMemo<RemoteChangeContextValue>(() => ({
    changedOccurrenceIds,
    dismissOccurrenceChange,
    noteOccurrenceChange,
  }), [changedOccurrenceIds, dismissOccurrenceChange, noteOccurrenceChange])
  return <RemoteChangeContext.Provider value={value}>{children}</RemoteChangeContext.Provider>
}

export function RemoteChangeNotice({ occurrenceId }: Readonly<{ occurrenceId: string }>) {
  const context = useContext(RemoteChangeContext)
  if (!context?.changedOccurrenceIds.includes(occurrenceId)) return null
  return <div aria-live="polite" className="rounded-control bg-warning/12 p-3 text-sm text-warning" role="status"><p>This task was updated. The latest information has been loaded.</p><button className="mt-2 font-semibold underline" onClick={() => context.dismissOccurrenceChange(occurrenceId)} type="button">Dismiss</button></div>
}
