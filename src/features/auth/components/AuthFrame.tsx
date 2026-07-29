import type { ReactNode } from 'react'
import { HomeMark } from '../../../components/ui/HomeMark'
import { Icon } from '../../../components/ui/Icon'

export function AuthFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="auth-page">
      <aside aria-hidden="true" className="auth-graphic">
        <div className="flex items-center gap-3">
          <HomeMark className="text-brand" size={42} />
          <span>
            <span className="block text-lg font-bold tracking-tight">HomeTeam</span>
            <span className="block text-sm text-sidebar-muted">Tasks, together.</span>
          </span>
        </div>
        <div className="relative mx-auto my-10 w-full max-w-md">
          <div className="absolute left-[10%] top-[10%] h-40 w-40 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative space-y-3">
            <div className="ml-auto flex w-[82%] items-center gap-3 rounded-panel bg-white/10 p-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white"><Icon name="check" /></span>
              <span className="flex-1">
                <span className="block h-2.5 w-28 rounded-full bg-white/80" />
                <span className="mt-2 block h-2 w-20 rounded-full bg-white/25" />
              </span>
              <span className="h-6 w-12 rounded-full bg-white/10" />
            </div>
            <div className="flex w-[74%] items-center gap-3 rounded-panel bg-white/7 p-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sidebar-muted"><Icon name="home" /></span>
              <span className="flex-1">
                <span className="block h-2.5 w-24 rounded-full bg-white/65" />
                <span className="mt-2 block h-2 w-16 rounded-full bg-white/20" />
              </span>
            </div>
            <div className="ml-auto flex w-[68%] items-center gap-3 rounded-panel bg-white/7 p-4">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sidebar-muted"><Icon name="users" /></span>
              <span className="flex-1">
                <span className="block h-2.5 w-20 rounded-full bg-white/65" />
                <span className="mt-2 block h-2 w-24 rounded-full bg-white/20" />
              </span>
            </div>
          </div>
        </div>
        <p className="max-w-sm text-xl font-semibold leading-snug tracking-tight">A calmer way to keep home moving—without keeping it all in your head.</p>
      </aside>
      <section className="auth-card" aria-labelledby="auth-page-title">{children}</section>
    </main>
  )
}
