import { Icon } from '../../components/ui/Icon'
import { categoryIconVisual } from './categoryIconName'

type CategoryIconSize = 'sm' | 'md' | 'lg'

const glyphSizes: Record<CategoryIconSize, number> = {
  sm: 17,
  md: 21,
  lg: 23,
}

export function CategoryIcon({
  categoryName,
  className = '',
  size = 'md',
}: Readonly<{
  categoryName?: string | null
  className?: string
  size?: CategoryIconSize
}>) {
  const visual = categoryIconVisual(categoryName)

  return (
    <span
      aria-hidden="true"
      className={`category-icon category-icon--${size} ${className}`.trim()}
      data-tone={visual.tone}
    >
      <Icon name={visual.icon} size={glyphSizes[size]} weight="duotone" />
    </span>
  )
}
