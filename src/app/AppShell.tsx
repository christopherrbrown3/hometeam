import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { getCurrentAccess } from '../features/access/accessService'
import { signOut } from '../features/auth/authService'
import { useSession } from '../features/auth/useSession'
import { supabase } from '../lib/supabase'
import { useRemoteChangeNotifier } from '../features/realtime/useRemoteChangeNotifier'
import { useRealtimeSync } from '../features/realtime/useRealtimeSync'

type AppShellProps = Readonly<{
  children: ReactNode
}>

const navigation = [
  { label: 'Today', to: '/today' },
  { label: 'Upcoming', to: '/upcoming' },
  { label: 'Tasks', to: '/tasks' },
  { label: 'History', to: '/history' },
  { label: 'More', to: '/more' },
] as const

export function AppShell({ children }: AppShellProps) {
  const { session } = useSession()
  const noteOccurrenceChange = useRemoteChangeNotifier()
  useRealtimeSync(noteOccurrenceChange)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const access = useQuery({
    enabled: Boolean(session),
    queryFn: () => getCurrentAccess(supabase),
    queryKey: ['current-access', session?.user.id],
    staleTime: Infinity,
  })

  async function handleSignOut() {
    setSignOutError(null)
    const result = await signOut(supabase)

    if (!result.ok) {
      setSignOutError(result.error.message)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-canvas">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-control bg-brand px-4 py-2 font-semibold text-white" href="#main-content">
        Skip to content
      </a>
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <span className="text-lg font-bold tracking-tight">HomeTeam</span>
          <span className="ml-2 text-sm text-muted">Tasks, together.</span>
        </div>
        <div className="flex items-center gap-2">
          {access.data?.isAdministrator && <NavLink className="min-h-11 content-center rounded-control px-2 text-sm font-semibold text-brand underline" to="/admin/access">Access requests</NavLink>}
          <button className="min-h-11 rounded-control px-2 text-sm font-semibold text-brand underline" onClick={() => void handleSignOut()} type="button">
            Sign out
          </button>
        </div>
      </header>
      {signOutError && <p className="px-5 pt-3 text-sm text-danger" role="alert">{signOutError}</p>}
      <main className="flex-1 px-5 py-6 pb-28" id="main-content">
        {children}
      </main>
      <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 border-t border-border bg-canvas px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-1">
          {navigation.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-11 items-center justify-center rounded-control px-1 text-center text-xs font-semibold transition-colors ${isActive ? 'bg-brand text-white' : 'text-muted hover:bg-surface-strong hover:text-ink'}`
              }
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
