import { describe, expect, it } from 'vitest'
import { buildHouseholdJoinLink } from './invitationLinks'

describe('household join links', () => {
  it('keeps the bearer token in the fragment instead of the request URL', () => {
    const link = buildHouseholdJoinLink('https://hometeam.example', '/more', 'secret/token')

    expect(link).toBe('https://hometeam.example/more#/join/secret%2Ftoken')
    expect(new URL(link).search).toBe('')
    expect(new URL(link).hash).toBe('#/join/secret%2Ftoken')
  })
})
