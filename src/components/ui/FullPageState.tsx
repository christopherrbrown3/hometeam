import { HomeMark } from './HomeMark'

export function FullPageState({ message }: Readonly<{ message: string }>) {
  return (
    <main aria-live="polite" className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <HomeMark className="text-brand" size={48} />
        <p className="text-sm font-semibold text-muted">{message}</p>
        <span className="h-1 w-20 overflow-hidden rounded-full bg-surface-strong">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-brand" />
        </span>
      </div>
    </main>
  )
}
