import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

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
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-canvas">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-control bg-brand px-4 py-2 font-semibold text-white" href="#main-content">
        Skip to content
      </a>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <span className="text-lg font-bold tracking-tight">HomeTeam</span>
        <span className="text-sm text-muted">Tasks, together.</span>
      </header>
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
