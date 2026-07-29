export function HomeMark({ className = '', size = 36 }: Readonly<{ className?: string; size?: number }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 40 40"
      width={size}
    >
      <rect fill="currentColor" height="40" rx="12" width="40" />
      <path d="M9.5 19.2 20 10.8l10.5 8.4" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" />
      <path d="M13.5 18.5v10h13v-10" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" />
      <path d="m16.4 23.4 2.4 2.4 5-5.2" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" />
    </svg>
  )
}
