import type { IconName } from '../../components/ui/Icon'

type CategoryIconRule = Readonly<{ icon: IconName; pattern: RegExp }>

/**
 * Rules intentionally prefer a specific activity over a broad place. For
 * example, "household admin" should read as paperwork rather than a house.
 */
const categoryIconRules: readonly CategoryIconRule[] = [
  { icon: 'utensils', pattern: /dishes?|dishwash/ },
  { icon: 'washing-machine', pattern: /laundry|clothes?|linen|\bwash(?:ing)?\b/ },
  { icon: 'broom', pattern: /clean|tidy|chore|housework|dust|vacuum|\bmop\b|sweep|bathroom/ },
  { icon: 'trash', pattern: /trash|rubbish|garbage|waste|\bbins?\b|recycl|compost/ },
  { icon: 'basket', pattern: /shop|grocery|groceries|market|store|buy|supplies/ },
  { icon: 'map', pattern: /errand|pick.?up|drop.?off|post office|return/ },
  { icon: 'cooking-pot', pattern: /meal|food|cook|kitchen|dinner|breakfast|lunch|bake/ },
  { icon: 'paw', pattern: /pet|dog|cat|animal|vet/ },
  { icon: 'shapes', pattern: /kid|child|school|baby|bedtime/ },
  { icon: 'users', pattern: /family|caregiv/ },
  { icon: 'pill', pattern: /health|medicine|\bmeds?\b|doctor|dental|therapy|pharmacy|wellness|self.?care/ },
  { icon: 'plant', pattern: /garden|yard|outdoor|plant|lawn|landscap/ },
  { icon: 'wrench', pattern: /maintenan|repair|fix|diy|handyman|renovat/ },
  { icon: 'receipt', pattern: /admin|bill|budget|finance|paperwork|document/ },
  { icon: 'car', pattern: /\bcar\b|vehicle|automotive|transport|commut/ },
  { icon: 'briefcase', pattern: /work|office|business/ },
  { icon: 'calendar', pattern: /appointment|schedule|calendar/ },
  { icon: 'confetti', pattern: /event|birthday|party|holiday|celebrat|occasion/ },
  { icon: 'home', pattern: /home|house|apartment|flat/ },
]

export function categoryIconName(categoryName: string | null | undefined): IconName {
  const normalized = categoryName?.trim().toLocaleLowerCase() ?? ''

  if (!normalized) return 'clipboard'

  return categoryIconRules.find(({ pattern }) => pattern.test(normalized))?.icon ?? 'tag'
}
