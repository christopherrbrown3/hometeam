import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { TaskForm } from './TaskForm/TaskForm'
import { saveTaskSeries } from './taskService'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { listHouseholdMembers } from '../households/membershipService'

export function TasksScreen() {
  const [showForm, setShowForm] = useState(false)
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
  if (households.isPending) return <p>Loading your household…</p>
  if (!householdId) return <p>Create a household in More before adding a task.</p>
  return <section className="mx-auto max-w-2xl space-y-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-brand">{households.data?.find((item) => item.id === householdId)?.name}</p><h1 className="text-2xl font-bold">Tasks</h1></div><Button onClick={() => setShowForm((current) => !current)} variant="secondary">{showForm ? 'Close' : 'New task'}</Button></div>{showForm && <TaskForm categories={categories.data ?? []} householdId={householdId} members={members.data ?? []} onSave={async (values) => { await saveTaskSeries(supabase, { ...values, householdId }); await queryClient.invalidateQueries({ queryKey: ['series', householdId] }); setShowForm(false) }} />}{series.isError && <p className="text-danger" role="alert">{series.error.message}</p>}{series.data?.length === 0 && <p className="rounded-panel border border-border p-5 text-muted">No task definitions yet. Add the first shared task for this household.</p>}<ul className="space-y-2">{series.data?.map((task) => <li className="rounded-panel border border-border p-4" key={task.id}><h2 className="font-bold">{task.title}</h2><p className="mt-1 text-sm text-muted">{task.recurrence_type.replace('_', ' ')} · {task.series_status}</p></li>)}</ul></section>
}
