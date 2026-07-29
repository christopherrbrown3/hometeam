import { Icon, type IconName } from './Icon'

export function EmptyState({
  action,
  description,
  icon = 'check',
  title,
}: Readonly<{
  action?: React.ReactNode
  description: React.ReactNode
  icon?: IconName
  title: React.ReactNode
}>) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} size={24} /></span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
