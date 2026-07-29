import { useQuery } from '@tanstack/react-query'
import { HistoryTimeline } from '../features/history/HistoryTimeline'
import { listHistory } from '../features/history/historyService'
import { supabase } from '../lib/supabase'
export function HistoryRoute() { const householdId = localStorage.getItem('hometeam.household-id') ?? undefined; const query = useQuery({ queryKey: ['history', householdId], queryFn: () => listHistory(supabase, householdId) }); return <section className="mx-auto max-w-2xl space-y-5"><header><p className="text-sm font-semibold text-brand">Activity</p><h1 className="text-2xl font-bold">History</h1></header>{query.isPending && <p>Loading history…</p>}{query.isError && <p className="text-danger" role="alert">{query.error.message}</p>}{query.data?.length === 0 && <p className="rounded-panel border border-border p-5 text-muted">No activity yet.</p>}{query.data && <HistoryTimeline events={query.data}/>}</section> }
