import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { OccurrenceDetails } from '../features/occurrences/OccurrenceDetails'
import { UpcomingGroups } from '../features/occurrences/UpcomingGroups'
import { getAuthorizedOccurrences, type OccurrenceWithTitle } from '../features/occurrences/todayQuery'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'

export function UpcomingRoute() {
  const [selected, setSelected] = useState<OccurrenceWithTitle | null>(null)
  const householdId = localStorage.getItem('hometeam.household-id') ?? undefined
  const query = useQuery({ queryKey: ['upcoming', householdId], queryFn: () => getAuthorizedOccurrences(supabase, { householdId }) })
  const future = query.data?.filter((item) => item.lifecycle_state === 'open' && new Date(item.original_due_start) >= new Date()) ?? []

  return (
    <section className="page-stack">
      <PageHeader description="See what’s ahead and make space for it." eyebrow="Plan ahead" title="Upcoming" />
      {query.isPending && <LoadingState label="Loading upcoming tasks…" />}
      {query.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{query.error.message}</p>}
      {!query.isPending && future.length === 0 && <EmptyState description="New scheduled tasks will appear here as their due dates get closer." icon="calendar" title="The calendar is clear" />}
      {future.length > 0 && <UpcomingGroups occurrences={future} onOpen={setSelected} />}
      {selected && <OccurrenceDetails occurrence={selected} onClose={() => setSelected(null)} />}
    </section>
  )
}
