import type { ReactNode } from 'react'

export function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: Readonly<{
  action?: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  title: ReactNode
}>) {
  return (
    <header className="page-header">
      <div className="min-w-0">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
