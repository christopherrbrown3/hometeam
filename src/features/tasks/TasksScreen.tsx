import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { TaskForm } from './TaskForm/TaskForm'
import { saveTaskSeries } from './taskService'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { listHouseholdMembers } from '../households/membershipService'
import { assignOccurrence, claimOccurrence, replaceRotationRoster, setOccurrenceAssignmentLock } from '../occurrences/assignmentService'
import { OccurrenceAssignmentControls } from '../occurrences/OccurrenceAssignmentControls'
import { useSession } from '../auth/useSession'
import { TaskDetails } from './TaskDetails'

export function TasksScreen() {
  const [showForm, setShowForm] = useState(false)
  const { session } = useSession()
  const queryClient = useQueryClient()
  const households = useQuery({ queryKey: ['households'], queryFn: async () => {
    const { data, error } = await supabase.from('households').select('*').order('name')
    if (error) throw error
    return data
  } })
  const householdId = localStorage.getItem('hometeam.household-id') ?? households.data?.[0]?.id
  const series = useQuery({ enabled: Boolean(householdId), queryKey: ['series', householdId], queryFn: async () => {
    const { data, error } = await supabase.from('task_series').select('*').eq('household_id', householdId!).order('title')
    if (error) throw error
    return data
  } })
  const categories = useQuery({ enabled: Boolean(householdId), queryKey: ['categories', householdId], queryFn: async () => {
    const { data, error } = await supabase.from('categories').select('id, name').eq('household_id', householdId!).order('name')
    if (error) throw error
    return data
  } })
  const members = useQuery({ enabled: Boolean(householdId), queryKey: ['members', householdId], queryFn: () => listHouseholdMembers(supabase, householdId!) })
  const occurrences = useQuery({ enabled: Boolean(householdId), queryKey: ['occurrences', householdId], queryFn: async () => {
    const { data, error } = await supabase.from('task_occurrences').select('*').eq('household_id', householdId!).eq('lifecycle_state', 'open').order('original_due_start').limit(20)
    if (error) throw error
    return data
  } })
  if (households.isPending) return <p>Loading your household…</p>
  if (!householdId) return <p>Create a household in More before adding a task.</p>
  const canManageAssignments = members.data?.some((member) => member.userId === session?.user.id && member.role === 'full_member') ?? false
  async function refreshAssignments() { await queryClient.invalidateQueries({ queryKey: ['occurrences', householdId] }) }
  async function refreshTaskViews() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
      queryClient.invalidateQueries({ queryKey: ['upcoming'] }),
    ])
  }
  return <section className="mx-auto max-w-2xl space-y-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-brand">{households.data?.find((item) => item.id === householdId)?.name}</p><h1 className="text-2xl font-bold">Tasks</h1></div><Button onClick={() => setShowForm((current) => !current)} variant="secondary">{showForm ? 'Close' : 'New task'}</Button></div>{showForm && <TaskForm categories={categories.data ?? []} householdId={householdId} members={members.data ?? []} onSave={async (values) => { const saved = await saveTaskSeries(supabase, { ...values, householdId }); if (values.assignmentMode === 'round_robin') await replaceRotationRoster(supabase, saved.id, values.rotationMemberIds); await Promise.all([queryClient.invalidateQueries({ queryKey: ['series', householdId] }), refreshTaskViews()]); setShowForm(false) }} />}{series.isError && <p className="text-danger" role="alert">{series.error.message}</p>}{series.data?.length === 0 && <p className="rounded-panel border border-border p-5 text-muted">No task definitions yet. Add the first shared task for this household.</p>}<div className="space-y-2">{series.data?.map((task) => <TaskDetails key={task.id} onChanged={() => void queryClient.invalidateQueries({ queryKey: ['series', householdId] })} series={task}/>)}</div><section aria-labelledby="open-assignments-heading" className="space-y-3"><h2 className="text-xl font-bold" id="open-assignments-heading">Open assignments</h2>{occurrences.isError && <p className="text-danger" role="alert">{occurrences.error.message}</p>}{occurrences.data?.length === 0 && <p className="rounded-panel border border-border p-4 text-muted">No open assignments right now.</p>}<ul className="space-y-3">{occurrences.data?.map((occurrence) => <li className="rounded-panel border border-border p-4" key={occurrence.id}><h3 className="font-semibold">{series.data?.find((task) => task.id === occurrence.series_id)?.title ?? 'Task occurrence'}</h3><p className="mt-1 text-sm text-muted">Due {new Date(occurrence.original_due_start).toLocaleString()}</p><div className="mt-3"><OccurrenceAssignmentControls canManage={canManageAssignments} members={members.data ?? []} occurrence={occurrence} onAssign={async (assigneeUserId, lock) => { await assignOccurrence(supabase, occurrence.id, assigneeUserId, occurrence.version, lock); await refreshAssignments() }} onClaim={async () => { await claimOccurrence(supabase, occurrence.id, occurrence.version); await refreshAssignments() }} onToggleLock={async (locked) => { await setOccurrenceAssignmentLock(supabase, occurrence.id, occurrence.version, locked); await refreshAssignments() }} /></div></li>)}</ul></section></section>
}
