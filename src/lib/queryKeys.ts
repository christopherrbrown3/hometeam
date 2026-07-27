export type HouseholdScope =
  | Readonly<{ kind: 'all' }>
  | Readonly<{ householdId: string; kind: 'household' }>

export type OccurrenceFilters = Readonly<{
  assigneeId?: string
  date?: string
  status?: 'open' | 'completed' | 'skipped' | 'cancelled'
}>

export type SeriesFilters = Readonly<{
  categoryId?: string
  includeArchived?: boolean
}>

export type HistoryFilters = Readonly<{
  actorId?: string
  endDate?: string
  eventType?: string
  startDate?: string
}>

export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  memberships: (userId: string) => ['memberships', userId] as const,
  household: (householdId: string) => ['household', householdId] as const,
  occurrences: (householdScope: HouseholdScope, filters: OccurrenceFilters) =>
    ['occurrences', householdScope, filters] as const,
  occurrence: (occurrenceId: string) => ['occurrence', occurrenceId] as const,
  series: (householdId: string, filters: SeriesFilters) =>
    ['series', householdId, filters] as const,
  seriesDetail: (seriesId: string) => ['series-detail', seriesId] as const,
  history: (householdScope: HouseholdScope, filters: HistoryFilters) =>
    ['history', householdScope, filters] as const,
  notificationPreferences: (userId: string) =>
    ['notification-preferences', userId] as const,
}
