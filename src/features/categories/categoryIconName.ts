import type { IconName } from '../../components/ui/Icon'

export type CategoryIconTone =
  | 'admin'
  | 'cleaning'
  | 'custom'
  | 'errands'
  | 'events'
  | 'health'
  | 'home'
  | 'kids'
  | 'meals'
  | 'outdoors'
  | 'pets'
  | 'transport'
  | 'uncategorized'
  | 'waste'
  | 'work'

export type CategoryIconVisual = Readonly<{
  icon: IconName
  tone: CategoryIconTone
}>

type CategoryIconRule = CategoryIconVisual & Readonly<{ pattern: RegExp }>

/**
 * Rules intentionally prefer a specific activity over a broad place. For
 * example, "household admin" should read as paperwork rather than a house.
 */
const categoryIconRules: readonly CategoryIconRule[] = [
  { icon: 'utensils', pattern: /dishes?|dishwash/, tone: 'cleaning' },
  { icon: 'washing-machine', pattern: /laundry|clothes?|linen|\bwash(?:ing)?\b/, tone: 'cleaning' },
  { icon: 'broom', pattern: /clean|tidy|chore|housework|dust|vacuum|\bmop\b|sweep|bathroom/, tone: 'cleaning' },
  { icon: 'trash', pattern: /trash|rubbish|garbage|waste|\bbins?\b|recycl|compost/, tone: 'waste' },
  { icon: 'basket', pattern: /shop|grocery|groceries|market|store|buy|supplies/, tone: 'errands' },
  { icon: 'map', pattern: /errand|pick.?up|drop.?off|post office|return/, tone: 'errands' },
  { icon: 'cooking-pot', pattern: /meal|food|cook|kitchen|dinner|breakfast|lunch|bake/, tone: 'meals' },
  { icon: 'paw', pattern: /pet|dog|cat|animal|vet/, tone: 'pets' },
  { icon: 'shapes', pattern: /kid|child|school|baby|bedtime/, tone: 'kids' },
  { icon: 'users', pattern: /family|caregiv/, tone: 'kids' },
  { icon: 'pill', pattern: /health|medicine|\bmeds?\b|doctor|dental|therapy|pharmacy|wellness|self.?care/, tone: 'health' },
  { icon: 'plant', pattern: /garden|yard|outdoor|plant|lawn|landscap/, tone: 'outdoors' },
  { icon: 'wrench', pattern: /maintenan|repair|fix|diy|handyman|renovat/, tone: 'work' },
  { icon: 'receipt', pattern: /admin|bill|budget|finance|paperwork|document/, tone: 'admin' },
  { icon: 'car', pattern: /\bcar\b|vehicle|automotive|transport|commut/, tone: 'transport' },
  { icon: 'briefcase', pattern: /work|office|business/, tone: 'work' },
  { icon: 'calendar', pattern: /appointment|schedule|calendar/, tone: 'events' },
  { icon: 'confetti', pattern: /event|birthday|party|holiday|celebrat|occasion/, tone: 'events' },
  { icon: 'home', pattern: /home|house|apartment|flat/, tone: 'home' },
]

export function categoryIconVisual(categoryName: string | null | undefined): CategoryIconVisual {
  const normalized = categoryName?.trim().toLocaleLowerCase() ?? ''

  if (!normalized) return { icon: 'clipboard', tone: 'uncategorized' }

  return categoryIconRules.find(({ pattern }) => pattern.test(normalized)) ?? { icon: 'tag', tone: 'custom' }
}

export function categoryIconName(categoryName: string | null | undefined): IconName {
  return categoryIconVisual(categoryName).icon
}
