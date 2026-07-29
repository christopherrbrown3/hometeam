import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { OccurrenceDetails } from '../features/occurrences/OccurrenceDetails'
import { TodayFilters } from '../features/occurrences/TodayFilters'
import { TodaySections } from '../features/occurrences/TodaySections'
import { getAuthorizedOccurrences, type OccurrenceWithTitle } from '../features/occurrences/todayQuery'
import type { DisplayDueState } from '../features/occurrences/dueState'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'
import { Icon } from '../components/ui/Icon'
import { householdDateAt } from '../lib/householdTime'

export function TodayRoute() {
  const [status, setStatus] = useState<DisplayDueState | 'all'>('all')
  const [selected, setSelected] = useState<OccurrenceWithTitle | null>(null)
  const householdId = localStorage.getItem('hometeam.household-id') ?? undefined
  const timeZoneQuery = useQuery({
    enabled: Boolean(householdId),
    queryFn: async () => {
      const { data, error } = await supabase.from('households').select('timezone').eq('id', householdId!).single()
      if (error) throw error
      return data.timezone
    },
    queryKey: ['household-timezone', householdId],
  })
  const timeZone = timeZoneQuery.data ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const isoDate = householdDateAt(new Date(), timeZone)
  const query = useQuery({
    enabled: !householdId || timeZoneQuery.isSuccess,
    queryFn: () => getAuthorizedOccurrences(supabase, { date: isoDate, householdId, householdTimeZone: householdId ? timeZone : undefined, status }),
    queryKey: ['occurrences', householdId, isoDate, status, timeZone],
  })
  const date = new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section className="page-stack">
      <PageHeader
        action={<Link aria-label="New task" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white transition duration-200 ease-out hover:bg-brand-hover active:scale-[0.98]" to="/tasks?new=1"><Icon name="plus" size={17} /><span className="hidden sm:inline">New task</span></Link>}
        description={date}
        eyebrow="Your household"
        title="Today"
      />
      <p className="mb-4 rounded-control bg-surface-strong px-3 py-2 text-sm text-muted"><strong className="text-ink">Overdue</strong> means its scheduled time has passed. <strong className="text-ink">Due now</strong> is currently within its scheduled time. <strong className="text-ink">Later today</strong> has not started yet.</p>
      <div className="mb-6"><TodayFilters onStatus={setStatus} status={status} /></div>
      {query.isPending && <LoadingState label="Loading today’s tasks…" />}
      {query.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{query.error.message}</p>}
      {!query.isPending && query.data?.length === 0 && <EmptyState description={status === 'all' ? 'There is nothing on the household list right now.' : 'Try another filter to see the rest of your household tasks.'} icon="check" title={status === 'all' ? 'You’re all caught up' : 'No tasks match'} />}
      {query.data && <TodaySections occurrences={query.data} onOpen={setSelected} />}
      {selected && <OccurrenceDetails occurrence={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
