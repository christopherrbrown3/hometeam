import { describe, expect, it } from 'vitest'
import { notificationContent, notificationTarget, parsePushPayload } from './pushPayload'

describe('push notification contract', () => {
  it('accepts only the display and occurrence routing fields', () => {
    expect(parsePushPayload({
      body: 'Feed the dog',
      endpoint: 'must-not-cross-the-service-worker-boundary',
      occurrenceId: 'occurrence/with spaces',
      title: 'Task due soon',
    })).toEqual({
      body: 'Feed the dog',
      occurrenceId: 'occurrence/with spaces',
      title: 'Task due soon',
    })
  })

  it('falls back to privacy-safe copy for malformed or empty payloads', () => {
    expect(notificationContent(parsePushPayload('not-json'))).toEqual({
      body: 'Open HomeTeam to see the latest authorized task details.',
      title: 'Household task update',
    })
  })

  it('routes clicks within the installed service-worker scope', () => {
    expect(notificationTarget('https://example.test/hometeam/', 'id with/slash'))
      .toBe('https://example.test/hometeam/#/today?occurrence=id%20with%2Fslash')
    expect(notificationTarget('https://example.test/hometeam/'))
      .toBe('https://example.test/hometeam/#/today')
  })
})
