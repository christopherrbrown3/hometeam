import { Icon } from '../../components/ui/Icon'
import type { AssigneeColor } from '../profiles/profileColors'
import { categoryIconName } from './categoryIconName'

type TaskIconSize = 'sm' | 'md' | 'lg'

const glyphSizes: Record<TaskIconSize, number> = {
  sm: 17,
  md: 21,
  lg: 23,
}

export function TaskIcon({
  assigneeColor,
  categoryName,
  className = '',
  size = 'md',
}: Readonly<{
  assigneeColor: AssigneeColor
  categoryName?: string | null
  className?: string
  size?: TaskIconSize
}>) {
  return (
    <span
      aria-hidden="true"
      className={`task-icon task-icon--${size} ${className}`.trim()}
      data-assignee-color={assigneeColor}
    >
      <Icon name={categoryIconName(categoryName)} size={glyphSizes[size]} weight="duotone" />
    </span>
  )
}
