import { Icon } from '../../components/ui/Icon'
import { categoryIconName } from './categoryIconName'

export function CategoryIcon({ categoryName, size = 19 }: Readonly<{ categoryName?: string | null; size?: number }>) {
  return <Icon name={categoryIconName(categoryName)} size={size} />
}
