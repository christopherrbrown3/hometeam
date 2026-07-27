import { describe, expect, it } from 'vitest'
import { queryKeys } from './queryKeys'

describe('queryKeys', () => {
  it('keeps occurrence caches scoped by household and filters', () => {
    expect(
      queryKeys.occurrences(
        { householdId: 'household-a', kind: 'household' },
        { assigneeId: 'user-a', status: 'open' },
      ),
    ).toEqual([
      'occurrences',
      { householdId: 'household-a', kind: 'household' },
      { assigneeId: 'user-a', status: 'open' },
    ])
  })
})
