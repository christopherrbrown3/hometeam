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
import { PageHeader } from '../../components/ui/PageHeader'
import { Icon } from '../../components/ui/Icon'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'

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
  if (households.isPending) return <section className="page-stack"><LoadingState label="Loading your household…" /></section>
  if (!householdId) return <section className="page-stack"><PageHeader description="Set up a household before creating shared tasks." eyebrow="Task library" title="Tasks" /><EmptyState description="Create a household from More, then come back to build your shared task list." icon="home" title="A household comes first" /></section>
  const canManageAssignments = members.data?.some((member) => member.userId === session?.user.id && member.role === 'full_member') ?? false
  async function refreshAssignments() { await queryClient.invalidateQueries({ queryKey: ['occurrences', householdId] }) }
  async function refreshTaskViews() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
      queryClient.invalidateQueries({ queryKey: ['upcoming'] }),
    ])
  }
  return (
    <section className="page-stack">
      <PageHeader
        action={<Button onClick={() => setShowForm((current) => !current)} variant={showForm ? 'secondary' : 'primary'}>{showForm ? 'Close' : <><Icon name="plus" size={18} /> New task</>}</Button>}
        description="Create the routines that keep everyone in sync."
        eyebrow={households.data?.find((item) => item.id === householdId)?.name}
        title="Tasks"
      />
      {showForm && (
        <div className="mb-7">
          <TaskForm
            categories={categories.data ?? []}
            householdId={householdId}
            members={members.data ?? []}
            onSave={async (values) => {
              const saved = await saveTaskSeries(supabase, { ...values, householdId })
              if (values.assignmentMode === 'round_robin') await replaceRotationRoster(supabase, saved.id, values.rotationMemberIds)
              await Promise.all([queryClient.invalidateQueries({ queryKey: ['series', householdId] }), refreshTaskViews()])
              setShowForm(false)
            }}
          />
        </div>
      )}
      {series.isPending && <LoadingState label="Loading tasks…" />}
      {series.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{series.error.message}</p>}
      {series.data?.length === 0 && <EmptyState action={<Button onClick={() => setShowForm(true)}><Icon name="plus" size={18} /> Add first task</Button>} description="Add a one-time chore or a repeating household routine." icon="list" title="Build your shared list" />}
      <div className="space-y-2">{series.data?.map((task) => <TaskDetails key={task.id} onChanged={() => void queryClient.invalidateQueries({ queryKey: ['series', householdId] })} series={task} />)}</div>

      <details className="settings-panel group mt-8">
        <summary className="settings-panel-header">
          <span className="settings-panel-icon"><Icon name="users" size={19} /></span>
          <span className="min-w-0 flex-1">
            <span className="settings-panel-title" id="open-assignments-heading">Open assignments</span>
            <span className="settings-panel-description block">Review or reassign individual task occurrences</span>
          </span>
          {occurrences.data && <span className="section-count">{occurrences.data.length}</span>}
          <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
        </summary>
        <div className="settings-panel-content border-t border-border pt-4">
          {occurrences.isError && <p className="text-sm text-danger" role="alert">{occurrences.error.message}</p>}
          {occurrences.data?.length === 0 && <p className="text-sm text-muted">No open assignments right now.</p>}
          <ul className="space-y-3">
            {occurrences.data?.map((occurrence) => (
              <li className="rounded-panel bg-canvas p-4" key={occurrence.id}>
                <h3 className="font-semibold">{series.data?.find((task) => task.id === occurrence.series_id)?.title ?? 'Task occurrence'}</h3>
                <p className="mt-1 text-sm text-muted">Due {new Date(occurrence.original_due_start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                <div className="mt-3"><OccurrenceAssignmentControls canManage={canManageAssignments} members={members.data ?? []} occurrence={occurrence} onAssign={async (assigneeUserId, lock) => { await assignOccurrence(supabase, occurrence.id, assigneeUserId, occurrence.version, lock); await refreshAssignments() }} onClaim={async () => { await claimOccurrence(supabase, occurrence.id, occurrence.version); await refreshAssignments() }} onToggleLock={async (locked) => { await setOccurrenceAssignmentLock(supabase, occurrence.id, occurrence.version, locked); await refreshAssignments() }} /></div>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </section>
  )
}
