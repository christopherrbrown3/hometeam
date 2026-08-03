import { describe, expect, it } from 'vitest'
import { assigneeColorFor, isProfileColor, profileColorOptions } from './profileColors'

describe('profile colors', () => {
  it('offers the four supported assignee colors', () => {
    expect(profileColorOptions.map(({ value }) => value)).toEqual(['blue', 'pink', 'green', 'orange'])
  })

  it('keeps gray unavailable because it means unassigned', () => {
    expect(isProfileColor('gray')).toBe(false)
    expect(isProfileColor('pink')).toBe(true)
  })

  it('resolves an assignee color and reserves the neutral token for no assignee', () => {
    const people = [{ profileColor: 'pink' as const, userId: 'person-1' }]
    expect(assigneeColorFor('person-1', people)).toBe('pink')
    expect(assigneeColorFor(null, people)).toBe('unassigned')
  })
})
