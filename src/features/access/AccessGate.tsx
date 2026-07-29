import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import { clearSessionData } from '../../app/sessionCleanup'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { getCurrentAccess } from './accessService'
import { FullPageState } from '../../components/ui/FullPageState'
import { HomeMark } from '../../components/ui/HomeMark'

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
    return <FullPageState message="Checking your HomeTeam access…" />
  }

  if (access.isError) {
    return <main className="flex min-h-dvh items-center justify-center bg-canvas p-6"><section className="max-w-md rounded-panel bg-surface p-6 text-center"><HomeMark className="mx-auto text-brand" size={48} /><h1 className="mt-4 text-xl font-bold">We could not check access</h1><p className="mt-2 text-sm text-muted">{access.error.message}</p></section></main>
  }

  if (access.data.status === 'approved') {
    return <Outlet />
  }

  return <Navigate replace to="/access" />
}
