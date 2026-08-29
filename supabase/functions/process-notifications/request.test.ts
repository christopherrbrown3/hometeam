import { describe, expect, it } from 'vitest'
import { readBoundedJsonObject } from './request.ts'

describe('processor request body contract', () => {
  it('accepts an empty body or an object containing only allowed keys', async () => {
    await expect(readBoundedJsonObject(
      new Request('https://example.test', { method: 'POST' }),
      new Set(['limit']),
    )).resolves.toEqual({})
    await expect(readBoundedJsonObject(
      new Request('https://example.test', { body: '{"limit":10}', method: 'POST' }),
      new Set(['limit']),
    )).resolves.toEqual({ limit: 10 })
  })

  it.each([
    '{',
    '[]',
    '{"limit":10,"unexpected":true}',
  ])('rejects malformed or expanded input: %s', async (body) => {
    await expect(readBoundedJsonObject(
      new Request('https://example.test', { body, method: 'POST' }),
      new Set(['limit']),
    )).resolves.toBeNull()
  })

  it('rejects an oversized body before parsing it', async () => {
    await expect(readBoundedJsonObject(
      new Request('https://example.test', { body: `{"limit":1,"padding":"${'x'.repeat(100)}"}`, method: 'POST' }),
      new Set(['limit']),
      32,
    )).resolves.toBeNull()
  })
})
