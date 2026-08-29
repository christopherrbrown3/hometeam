import { describe, expect, it } from 'vitest'
import { isAuthorizedProcessorRequest, resolveSupabaseServerKey } from './auth.ts'

describe('scheduled processor authorization', () => {
  const secret = 'a-high-entropy-processor-secret-that-is-long-enough'

  it('accepts only the exact high-entropy scheduler secret', () => {
    expect(isAuthorizedProcessorRequest(new Request('https://example.test', {
      headers: { 'x-hometeam-processor-secret': secret },
    }), secret)).toBe(true)
    expect(isAuthorizedProcessorRequest(new Request('https://example.test', {
      headers: { 'x-hometeam-processor-secret': `${secret}-wrong` },
    }), secret)).toBe(false)
    expect(isAuthorizedProcessorRequest(new Request('https://example.test'), 'too-short')).toBe(false)
  })

  it('prefers the hosted secret-key bundle and supports the legacy local runtime key', () => {
    expect(resolveSupabaseServerKey(
      JSON.stringify({ current: { key: 'sb_secret_current-key' } }),
      'legacy-service-role',
    )).toBe('sb_secret_current-key')
    expect(resolveSupabaseServerKey('not-json', 'legacy-service-role')).toBe('legacy-service-role')
  })
})
