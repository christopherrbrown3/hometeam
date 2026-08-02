import { describe, expect, it } from 'vitest'
import { categoryIconName } from './categoryIconName'

describe('categoryIconName', () => {
  it.each([
    ['Cleaning', 'spark'],
    ['Errands', 'shopping-bag'],
    ['Meals', 'utensils'],
    ['Pets', 'paw'],
    ['Health & medicine', 'heart'],
    ['Garden', 'leaf'],
    ['Bring in bins', 'trash'],
  ] as const)('maps %s to %s', (categoryName, iconName) => {
    expect(categoryIconName(categoryName)).toBe(iconName)
  })

  it('uses Home for uncategorized and unknown categories', () => {
    expect(categoryIconName(null)).toBe('home')
    expect(categoryIconName('')).toBe('home')
    expect(categoryIconName('Household admin')).toBe('home')
  })
})
