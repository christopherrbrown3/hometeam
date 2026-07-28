import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import { clearSessionData } from '../../app/sessionCleanup'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { getCurrentAccess } from './accessService'

export function AccessGate() {
  const { session } = useSession()
  const queryClient = useQueryClient()
  const access = useQuery({
    enabled: Boolean(session),
    queryFn: () => getCurrentAccess(supabase),
    queryKey: ['current-access', session?.user.id],
    refetchInterval: 30_000,
    retry: false,
  })

  useEffect(() => {
    if (access.data && access.data.status !== 'approved') {
      clearSessionData(queryClient)
    }
  }, [access.data, queryClient])

  if (access.isPending) {
    return <p aria-live="polite">Checking your HomeTeam access…</p>
  }

  if (access.isError) {
    return <main><h1>We could not check access</h1><p>{access.error.message}</p></main>
  }

  if (access.data.status === 'approved') {
    return <Outlet />
  }

  return <Navigate replace to="/access" />
}
