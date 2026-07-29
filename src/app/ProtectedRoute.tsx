import { Navigate, Outlet, useLocation } from 'react-router'
import { saveReturnLocation } from '../features/auth/returnLocation'
import { useSession } from '../features/auth/useSession'
import { FullPageState } from '../components/ui/FullPageState'

export function ProtectedRoute() {
  const { isLoading, session } = useSession()
  const location = useLocation()

  if (isLoading) {
    return <FullPageState message="Checking your session…" />
  }

  if (!session) {
    saveReturnLocation(location.pathname, location.search)
    return <Navigate replace to="/login" />
  }

  return <Outlet />
}
