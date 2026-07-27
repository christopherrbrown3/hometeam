import type { ComponentPropsWithoutRef } from 'react'

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

const variantClasses = {
  danger: 'bg-danger text-white hover:bg-danger/90',
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'border border-border bg-canvas text-ink hover:bg-surface-strong',
} satisfies Record<NonNullable<ButtonProps['variant']>, string>

export function Button({
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`min-h-11 rounded-control px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    />
  )
}
