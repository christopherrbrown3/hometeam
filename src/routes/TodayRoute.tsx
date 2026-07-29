import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { OccurrenceDetails } from '../features/occurrences/OccurrenceDetails'
import { TodayFilters } from '../features/occurrences/TodayFilters'
import { TodaySections } from '../features/occurrences/TodaySections'
import { getAuthorizedOccurrences, type OccurrenceWithTitle } from '../features/occurrences/todayQuery'
import type { DisplayDueState } from '../features/occurrences/dueState'
import { supabase } from '../lib/supabase'

export function TodayRoute() { const [status, setStatus] = useState<DisplayDueState | 'all'>('all'); const [selected, setSelected] = useState<OccurrenceWithTitle | null>(null); const householdId = localStorage.getItem('hometeam.household-id') ?? undefined; const query = useQuery({ queryKey: ['occurrences', householdId, status], queryFn: () => getAuthorizedOccurrences(supabase, { householdId, status }) }); return <section className="mx-auto max-w-2xl space-y-5"><header><p className="text-sm font-semibold text-brand">Your household</p><h1 className="text-2xl font-bold">Today</h1><p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p></header><TodayFilters onStatus={setStatus} status={status}/>{query.isPending && <p>Loading today’s tasks…</p>}{query.isError && <p role="alert" className="text-danger">{query.error.message}</p>}{!query.isPending && query.data?.length === 0 && <p className="rounded-panel border border-border p-5 text-muted">Nothing matching these filters.</p>}{query.data && <TodaySections occurrences={query.data} onOpen={setSelected}/>} {selected && <OccurrenceDetails occurrence={selected} onClose={() => setSelected(null)}/>}</section> }
