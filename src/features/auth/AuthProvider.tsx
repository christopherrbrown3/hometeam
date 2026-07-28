import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { clearSessionData } from '../../app/sessionCleanup'
import { AuthContext } from './useSession'

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const currentUserId = useRef<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        currentUserId.current = data.session?.user.id ?? null
        setSession(data.session)
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null

      if (event === 'SIGNED_OUT' || currentUserId.current !== nextUserId) {
        clearSessionData(queryClient)
      }

      if (isMounted) {
        currentUserId.current = nextUserId
        setSession(nextSession)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [queryClient])

  const value = useMemo(() => ({ session, isLoading }), [isLoading, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
