import type { ReactNode } from 'react'

type AuthPageHeadingProps = Readonly<{
  children: ReactNode
  title: string
}>

export function AuthPageHeading({ children, title }: AuthPageHeadingProps) {
  return (
    <>
      <p className="text-sm font-semibold text-brand">HomeTeam</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight" id="auth-page-title">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
    </>
  )
}
