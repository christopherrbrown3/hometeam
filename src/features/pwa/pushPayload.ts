export type HomeTeamPushPayload = Readonly<{
  body?: string
  occurrenceId?: string
  title?: string
}>

export function parsePushPayload(value: unknown): HomeTeamPushPayload {
  if (!value || typeof value !== 'object') return {}
  const record = value as Record<string, unknown>
  return {
    body: typeof record.body === 'string' ? record.body : undefined,
    occurrenceId: typeof record.occurrenceId === 'string' ? record.occurrenceId : undefined,
    title: typeof record.title === 'string' ? record.title : undefined,
  }
}

export function notificationTarget(scope: string, occurrenceId?: string) {
  const fragment = occurrenceId
    ? `#/today?occurrence=${encodeURIComponent(occurrenceId)}`
    : '#/today'
  return new URL(fragment, scope).href
}

export function notificationContent(payload: HomeTeamPushPayload) {
  return {
    body: payload.body ?? 'Open HomeTeam to see the latest authorized task details.',
    title: payload.title ?? 'Household task update',
  }
}
