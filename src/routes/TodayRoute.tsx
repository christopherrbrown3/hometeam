import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { OccurrenceDetails } from '../features/occurrences/OccurrenceDetails'
import { TodayFilters } from '../features/occurrences/TodayFilters'
import { TodaySections } from '../features/occurrences/TodaySections'
import { getAuthorizedOccurrences, type OccurrenceWithTitle } from '../features/occurrences/todayQuery'
import type { DisplayDueState } from '../features/occurrences/dueState'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'

export function TodayRoute() {
  const [status, setStatus] = useState<DisplayDueState | 'all'>('all')
  const [selected, setSelected] = useState<OccurrenceWithTitle | null>(null)
  const householdId = localStorage.getItem('hometeam.household-id') ?? undefined
  const query = useQuery({ queryKey: ['occurrences', householdId, status], queryFn: () => getAuthorizedOccurrences(supabase, { householdId, status }) })
  const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <section className="page-stack">
      <PageHeader description={date} eyebrow="Your household" title="Today" />
      <div className="mb-6"><TodayFilters onStatus={setStatus} status={status} /></div>
      {query.isPending && <LoadingState label="Loading today’s tasks…" />}
      {query.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{query.error.message}</p>}
      {!query.isPending && query.data?.length === 0 && <EmptyState description={status === 'all' ? 'There is nothing on the household list right now.' : 'Try another filter to see the rest of your household tasks.'} icon="check" title={status === 'all' ? 'You’re all caught up' : 'No tasks match'} />}
      {query.data && <TodaySections occurrences={query.data} onOpen={setSelected} />}
      {selected && <OccurrenceDetails occurrence={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
