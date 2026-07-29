import { useQuery } from '@tanstack/react-query'
import { HistoryTimeline } from '../features/history/HistoryTimeline'
import { listHistory } from '../features/history/historyService'
import { supabase } from '../lib/supabase'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingState } from '../components/ui/LoadingState'
import { PageHeader } from '../components/ui/PageHeader'

export function HistoryRoute() {
  const householdId = localStorage.getItem('hometeam.household-id') ?? undefined
  const query = useQuery({ queryKey: ['history', householdId], queryFn: () => listHistory(supabase, householdId) })

  return (
    <section className="page-stack">
      <PageHeader description="A shared record of what your household has done." eyebrow="Activity" title="History" />
      {query.isPending && <LoadingState label="Loading history…" />}
      {query.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{query.error.message}</p>}
      {query.data?.length === 0 && <EmptyState description="Completed, skipped, and reassigned tasks will show up here." icon="activity" title="No activity yet" />}
      {query.data && <HistoryTimeline events={query.data} />}
    </section>
  )
}
