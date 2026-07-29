import { Navigate, Outlet } from 'react-router'
import { useSession } from './useSession'
import { consumeReturnLocation } from './returnLocation'
import { FullPageState } from '../../components/ui/FullPageState'

export function PublicOnly() {
  const { isLoading, session } = useSession()

  if (isLoading) {
    return <FullPageState message="Getting HomeTeam ready…" />
  }

  return session ? <Navigate replace to={consumeReturnLocation()} /> : <Outlet />
}
