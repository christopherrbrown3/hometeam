import type { ReactNode } from 'react'
import { HomeMark } from '../../../components/ui/HomeMark'

type AuthPageHeadingProps = Readonly<{
  children: ReactNode
  title: string
}>

export function AuthPageHeading({ children, title }: AuthPageHeadingProps) {
  return (
    <>
      <div className="mb-8 flex items-center gap-2.5 md:hidden"><HomeMark className="text-brand" size={34} /><span className="font-bold tracking-tight">HomeTeam</span></div>
      <p className="text-sm font-semibold text-brand">Welcome home</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight" id="auth-page-title">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
    </>
  )
}
