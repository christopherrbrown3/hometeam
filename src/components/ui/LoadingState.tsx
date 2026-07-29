export function LoadingState({ label = 'Loading…', rows = 3 }: Readonly<{ label?: string; rows?: number }>) {
  return (
    <div aria-label={label} className="space-y-3" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <span className="skeleton-row" key={index}>
          <span className="skeleton-dot" />
          <span className="skeleton-lines"><span /><span /></span>
        </span>
      ))}
    </div>
  )
}
