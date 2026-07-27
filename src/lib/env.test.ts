import { describe, expect, it } from 'vitest'
import { readAppEnvironment } from './env'

describe('readAppEnvironment', () => {
  it('returns valid browser-safe Supabase configuration', () => {
    expect(
      readAppEnvironment({
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
      }),
    ).toEqual({
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
    })
  })

  it('rejects missing configuration without exposing values', () => {
    expect(() => readAppEnvironment({})).toThrow(
      'Invalid HomeTeam browser environment configuration: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  })
})
