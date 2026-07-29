import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router'
import { getCurrentAccess } from '../features/access/accessService'
import { signOut } from '../features/auth/authService'
import { useSession } from '../features/auth/useSession'
import { supabase } from '../lib/supabase'
import { useRemoteChangeNotifier } from '../features/realtime/useRemoteChangeNotifier'
import { useRealtimeSync } from '../features/realtime/useRealtimeSync'
import { HomeMark } from '../components/ui/HomeMark'
import { Icon } from '../components/ui/Icon'

type AppShellProps = Readonly<{
  children: ReactNode
}>

const navigation = [
  { icon: 'check', label: 'Today', to: '/today' },
  { icon: 'calendar', label: 'Upcoming', to: '/upcoming' },
  { icon: 'list', label: 'Tasks', to: '/tasks' },
  { icon: 'activity', label: 'History', to: '/history' },
  { icon: 'more', label: 'More', to: '/more' },
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
    <div className="app-frame bg-canvas">
      <a className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 rounded-control bg-brand px-4 py-2 font-semibold text-white" href="#main-content">
        Skip to content
      </a>
      <aside className="hidden h-dvh flex-col bg-sidebar px-3 py-5 text-white md:sticky md:top-0 md:flex">
        <NavLink className="mb-8 flex items-center gap-3 px-2" to="/today">
          <HomeMark className="text-brand" />
          <span>
            <span className="block text-base font-bold tracking-tight">HomeTeam</span>
            <span className="block text-xs text-sidebar-muted">Tasks, together.</span>
          </span>
        </NavLink>
        <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
          {access.data?.isAdministrator && (
            <NavLink className="flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold text-sidebar-muted transition-colors hover:bg-white/8 hover:text-white" to="/admin/access">
              <Icon name="lock" size={18} />
              Access requests
            </NavLink>
          )}
          <button className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-semibold text-sidebar-muted transition-colors hover:bg-white/8 hover:text-white" onClick={() => void handleSignOut()} type="button">
            <Icon name="user" size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-5 md:hidden">
          <NavLink className="flex items-center gap-2.5" to="/today">
            <HomeMark className="text-brand" size={32} />
            <span className="font-bold tracking-tight">HomeTeam</span>
          </NavLink>
          {access.data?.isAdministrator && (
            <NavLink aria-label="Review preview accounts" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-strong hover:text-brand" to="/admin/access">
              <Icon name="lock" size={19} />
            </NavLink>
          )}
        </header>
        {signOutError && <p className="mx-5 mt-3 rounded-control bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{signOutError}</p>}
        <main className="app-main" id="main-content">
          <div className="route-content">
            {children}
          </div>
        </main>
        <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:bottom-auto md:left-3 md:right-auto md:top-24 md:w-[13.5rem] md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 md:flex md:max-w-none md:flex-col">
            {navigation.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `group flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-control px-1 text-center text-[0.68rem] font-semibold transition-colors md:min-h-11 md:flex-row md:justify-start md:gap-3 md:px-3 md:text-left md:text-sm ${isActive ? 'text-brand md:bg-white/10 md:text-white' : 'text-muted hover:bg-surface-strong hover:text-ink md:text-sidebar-muted md:hover:bg-white/8 md:hover:text-white'}`
                }
                key={item.to}
                to={item.to}
              >
                {({ isActive }) => (
                  <>
                    <span className={`inline-flex h-6 min-w-8 items-center justify-center rounded-full transition-colors md:h-7 md:w-7 md:min-w-7 md:rounded-lg ${isActive ? 'bg-brand-soft md:bg-brand md:text-white' : ''}`}>
                      <Icon name={item.icon} size={18} />
                    </span>
                    {item.label}
                    {isActive && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-brand md:block" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
