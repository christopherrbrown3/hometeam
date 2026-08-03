import { describe, expect, it } from 'vitest'
import { categoryIconName, categoryIconVisual } from './categoryIconName'

describe('categoryIconName', () => {
  it.each([
    ['Home', 'home'],
    ['Cleaning', 'broom'],
    ['Laundry', 'washing-machine'],
    ['Dishwasher', 'utensils'],
    ['Errands', 'map'],
    ['Grocery shopping', 'basket'],
    ['Meals', 'cooking-pot'],
    ['Pets', 'paw'],
    ['Kids', 'shapes'],
    ['Health & medicine', 'pill'],
    ['Appointments', 'calendar'],
    ['Events', 'confetti'],
    ['Garden', 'plant'],
    ['Bring in bins', 'trash'],
    ['Home maintenance', 'wrench'],
    ['Household admin', 'receipt'],
    ['Car care', 'car'],
  ] as const)('maps %s to a meaningful %s icon', (categoryName, iconName) => {
    expect(categoryIconName(categoryName)).toBe(iconName)
  })

  it('uses a neutral task icon when no category is assigned', () => {
    expect(categoryIconName(null)).toBe('clipboard')
    expect(categoryIconName('')).toBe('clipboard')
    expect(categoryIconVisual(undefined).tone).toBe('uncategorized')
  })

  it('uses a tag for an unmatched user-created category', () => {
    expect(categoryIconName('Weekend projects')).toBe('tag')
    expect(categoryIconVisual('Weekend projects').tone).toBe('custom')
  })
})
