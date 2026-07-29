import { useContext } from 'react'
import { RemoteChangeContext } from './remoteChangeContext'

export function useRemoteChangeNotifier() {
  const context = useContext(RemoteChangeContext)
  if (!context) throw new Error('useRemoteChangeNotifier must be used inside RemoteChangeProvider.')
  return context.noteOccurrenceChange
}
