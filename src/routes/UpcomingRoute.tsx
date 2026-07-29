import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { OccurrenceDetails } from '../features/occurrences/OccurrenceDetails'
import { UpcomingGroups } from '../features/occurrences/UpcomingGroups'
import { getAuthorizedOccurrences, type OccurrenceWithTitle } from '../features/occurrences/todayQuery'
import { supabase } from '../lib/supabase'

export function UpcomingRoute() { const [selected, setSelected] = useState<OccurrenceWithTitle | null>(null); const householdId = localStorage.getItem('hometeam.household-id') ?? undefined; const query = useQuery({ queryKey: ['upcoming', householdId], queryFn: () => getAuthorizedOccurrences(supabase, { householdId }) }); const future = query.data?.filter((item) => item.lifecycle_state === 'open' && new Date(item.original_due_start) >= new Date()) ?? []; return <section className="mx-auto max-w-2xl space-y-5"><header><p className="text-sm font-semibold text-brand">Plan ahead</p><h1 className="text-2xl font-bold">Upcoming</h1></header>{query.isPending && <p>Loading upcoming tasks…</p>}{query.isError && <p className="text-danger" role="alert">{query.error.message}</p>}{!query.isPending && future.length === 0 && <p className="rounded-panel border border-border p-5 text-muted">No upcoming tasks yet.</p>}{future.length > 0 && <UpcomingGroups occurrences={future} onOpen={setSelected}/>} {selected && <OccurrenceDetails occurrence={selected} onClose={() => setSelected(null)}/>}</section> }
