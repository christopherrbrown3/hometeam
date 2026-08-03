import type { Database } from '../../types/database'

export type ProfileColor = Database['public']['Enums']['profile_color']
export type AssigneeColor = ProfileColor | 'unassigned'

export const profileColorOptions = [
  { label: 'Blue', value: 'blue' },
  { label: 'Pink', value: 'pink' },
  { label: 'Green', value: 'green' },
  { label: 'Orange', value: 'orange' },
] as const satisfies ReadonlyArray<Readonly<{ label: string; value: ProfileColor }>>

export function isProfileColor(value: string): value is ProfileColor {
  return profileColorOptions.some((option) => option.value === value)
}

export function assigneeColorFor(
  userId: string | null | undefined,
  people: readonly Readonly<{ profileColor: ProfileColor; userId: string }>[],
): AssigneeColor {
  if (!userId) return 'unassigned'
  return people.find((person) => person.userId === userId)?.profileColor ?? 'blue'
}
