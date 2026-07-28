import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthContextValue = Readonly<{
  session: Session | null
  isLoading: boolean
}>

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useSession() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useSession must be used within AuthProvider.')
  }

  return context
}
