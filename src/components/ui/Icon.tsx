import type { SVGProps } from 'react'

export type IconName =
  | 'activity'
  | 'calendar'
  | 'check'
  | 'chevron-right'
  | 'clock'
  | 'home'
  | 'inbox'
  | 'list'
  | 'lock'
  | 'more'
  | 'plus'
  | 'x'
  | 'settings'
  | 'spark'
  | 'user'
  | 'users'

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName
  size?: number
}

const paths: Record<IconName, React.ReactNode> = {
  activity: <><path d="M4 12h3l2-5 4 10 2-5h5" /></>,
  calendar: <><rect height="16" rx="2" width="18" x="3" y="5" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  'chevron-right': <><path d="m9 18 6-6-6-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  home: <><path d="m3 11 9-7 9 7" /><path d="M5.5 10v9.5h13V10M9.5 19.5v-6h5v6" /></>,
  inbox: <><path d="M4 5h16l1 10H16l-2 3h-4l-2-3H3L4 5Z" /><path d="M3.5 12H8l2 3h4l2-3h4.5" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>,
  lock: <><rect height="11" rx="2" width="16" x="4" y="10" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  x: <><path d="m6 6 12 12M18 6 6 18" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.37a1.7 1.7 0 0 0-1 .63 1.7 1.7 0 0 0-.37 1.06V21h-4v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.23 15a1.7 1.7 0 0 0-.63-1 1.7 1.7 0 0 0-1.06-.37H2.5v-4h.08A1.7 1.7 0 0 0 4.1 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.5 4.23a1.7 1.7 0 0 0 1-.63 1.7 1.7 0 0 0 .37-1.06V2.5h4v.08A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 8c.38.27.63.63.63 1.06v.08h1.5v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
  spark: <><path d="m12 3 1.2 4.1L17 9l-3.8 1.9L12 15l-1.2-4.1L7 9l3.8-1.9L12 3Z" /><path d="m19 15 .6 2.1L22 18l-2.4.9L19 21l-.6-2.1L16 18l2.4-.9L19 15Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
