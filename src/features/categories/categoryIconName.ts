import type { IconName } from '../../components/ui/Icon'

type CategoryIconRule = Readonly<{
  icon: IconName
  pattern: RegExp
}>

const categoryIconRules: readonly CategoryIconRule[] = [
  { icon: 'spark', pattern: /clean|tidy|chore|housework|laundry/ },
  { icon: 'shopping-bag', pattern: /errand|shop|grocery|store|buy/ },
  { icon: 'utensils', pattern: /meal|food|cook|kitchen|dinner|breakfast|lunch/ },
  { icon: 'paw', pattern: /pet|dog|cat|animal/ },
  { icon: 'users', pattern: /kid|child|school|family/ },
  { icon: 'heart', pattern: /health|medicine|meds?|doctor|appointment/ },
  { icon: 'leaf', pattern: /garden|yard|outdoor|plant/ },
  { icon: 'trash', pattern: /trash|bin|recycl/ },
  { icon: 'briefcase', pattern: /work|office/ },
  { icon: 'calendar', pattern: /event|calendar|birthday|party/ },
  { icon: 'home', pattern: /home|house/ },
]

/** Returns a recognizable glyph for a user-created category, with Home as the safe fallback. */
export function categoryIconName(categoryName: string | null | undefined): IconName {
  const normalized = categoryName?.trim().toLocaleLowerCase() ?? ''
  return categoryIconRules.find(({ pattern }) => pattern.test(normalized))?.icon ?? 'home'
}
