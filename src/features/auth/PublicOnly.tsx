import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useSession } from './useSession'
import { peekReturnLocation } from './returnLocation'
import { FullPageState } from '../../components/ui/FullPageState'

export function PublicOnly() {
  const { isLoading, session } = useSession()
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ behavior: 'auto', left: 0, top: 0 })
  }, [pathname])

  if (isLoading) {
    return <FullPageState message="Getting HomeTeam ready…" />
  }

  return session ? <Navigate replace to={peekReturnLocation()} /> : <Outlet />
}
