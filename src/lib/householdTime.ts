import type { HouseholdDateTime, IsoDate, LocalTime } from '../features/recurrence/types'

const partFormatterCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string) {
  let formatter = partFormatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      day: '2-digit', hour: '2-digit', hourCycle: 'h23', minute: '2-digit', month: '2-digit', timeZone, year: 'numeric',
    })
    partFormatterCache.set(timeZone, formatter)
  }
  return formatter
}

function localParts(instant: Date, timeZone: string): HouseholdDateTime {
  const values = Object.fromEntries(partsFormatter(timeZone).formatToParts(instant)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]))
  return { date: `${values.year}-${values.month}-${values.day}` as IsoDate, time: `${values.hour}:${values.minute}` as LocalTime }
}

function compareLocal(left: HouseholdDateTime, right: HouseholdDateTime) {
  return `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`)
}

/**
 * Resolves a wall-clock household time deterministically. Ambiguous fall-back
 * times use the earlier instant; a nonexistent spring-forward time advances to
 * the first real local minute. This keeps generation repeatable on every host.
 */
export function resolveHouseholdDateTime(value: HouseholdDateTime, timeZone: string): Date {
  const [year, month, day] = value.date.split('-').map(Number)
  const [hour, minute] = value.time.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error('Invalid household date or time.')
  const wallClock = Date.UTC(year, month - 1, day, hour, minute)
  const target = `${value.date}T${value.time}`
  const candidates: Date[] = []
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 1) {
    const candidate = new Date(wallClock + offset * 60_000)
    const local = localParts(candidate, timeZone)
    if (`${local.date}T${local.time}` === target) candidates.push(candidate)
  }
  if (candidates.length) return candidates[0]

  for (let offset = -14 * 60; offset <= 14 * 60; offset += 1) {
    const candidate = new Date(wallClock + offset * 60_000)
    if (compareLocal(localParts(candidate, timeZone), value) >= 0) return candidate
  }
  throw new Error(`Could not resolve ${target} in ${timeZone}.`)
}

export function formatInHouseholdTime(instant: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(instant))
}

export function householdDateAt(instant: Date | string, timeZone: string): IsoDate {
  return localParts(new Date(instant), timeZone).date
}
