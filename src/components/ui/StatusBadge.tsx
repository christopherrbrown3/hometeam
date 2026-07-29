import type { ReactNode } from 'react'

type StatusBadgeProps = Readonly<{
  children: ReactNode
  tone: 'danger' | 'neutral' | 'success' | 'warning'
}>

const toneClasses = {
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface-strong text-muted',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
} satisfies Record<StatusBadgeProps['tone'], string>

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
