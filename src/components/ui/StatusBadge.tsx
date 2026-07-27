import type { ReactNode } from 'react'

type StatusBadgeProps = Readonly<{
  children: ReactNode
  tone: 'danger' | 'neutral' | 'success' | 'warning'
}>

const toneClasses = {
  danger: 'bg-danger/12 text-danger',
  neutral: 'bg-surface-strong text-muted',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
} satisfies Record<StatusBadgeProps['tone'], string>

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
