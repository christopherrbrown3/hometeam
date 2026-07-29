import { createContext } from 'react'

export type RemoteChangeContextValue = Readonly<{
  changedOccurrenceIds: readonly string[]
  dismissOccurrenceChange: (occurrenceId: string) => void
  noteOccurrenceChange: (occurrenceId: string) => void
}>

export const RemoteChangeContext = createContext<RemoteChangeContextValue | null>(null)
