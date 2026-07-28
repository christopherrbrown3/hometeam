import { Navigate, Outlet } from 'react-router'
import { useSession } from './useSession'
import { consumeReturnLocation } from './returnLocation'

export function PublicOnly() {
  const { isLoading, session } = useSession()

  if (isLoading) {
    return <p aria-live="polite">Checking your session…</p>
  }

  return session ? <Navigate replace to={consumeReturnLocation()} /> : <Outlet />
}
