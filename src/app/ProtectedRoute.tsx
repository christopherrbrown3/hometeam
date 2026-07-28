import { Navigate, Outlet, useLocation } from 'react-router'
import { saveReturnLocation } from '../features/auth/returnLocation'
import { useSession } from '../features/auth/useSession'

export function ProtectedRoute() {
  const { isLoading, session } = useSession()
  const location = useLocation()

  if (isLoading) {
    return <p aria-live="polite">Checking your session…</p>
  }

  if (!session) {
    saveReturnLocation(location.pathname, location.search)
    return <Navigate replace to="/login" />
  }

  return <Outlet />
}
