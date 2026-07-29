import type { ComponentPropsWithoutRef } from 'react'

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger'
}

const variantClasses = {
  danger: 'bg-danger text-white hover:bg-danger/90',
  primary: 'bg-brand text-white hover:bg-brand-hover',
  secondary: 'border border-border bg-surface text-ink hover:border-brand/35 hover:bg-brand-soft/40',
} satisfies Record<NonNullable<ButtonProps['variant']>, string>

export function Button({
  className = '',
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition duration-200 ease-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    />
  )
}
