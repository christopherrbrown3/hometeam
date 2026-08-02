import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Database } from '../../types/database'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { LoadingState } from '../../components/ui/LoadingState'
import { PageHeader } from '../../components/ui/PageHeader'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { listHouseholdMembers } from '../households/membershipService'
import { CategoryIcon } from '../categories/CategoryIcon'
import { assignOccurrence, claimOccurrence, replaceRotationRoster, setOccurrenceAssignmentLock } from '../occurrences/assignmentService'
import { OccurrenceAssignmentControls } from '../occurrences/OccurrenceAssignmentControls'
import type { TaskFormValues } from './taskFormSchema'
import { normalizeDatabaseTime } from './taskTime'
import { TaskForm } from './TaskForm/TaskForm'
import { TaskDetails } from './TaskDetails'
import { saveTaskSeries } from './taskService'

type Series = Database['public']['Tables']['task_series']['Row']
type Slot = Database['public']['Tables']['task_schedule_slots']['Row']
type RotationMember = Database['public']['Tables']['task_rotation_members']['Row']

function initialTaskValues(series: Series, slots: readonly Slot[], rotationMembers: readonly RotationMember[]): Partial<TaskFormValues> {
  return {
    assignmentMode: series.assignment_mode,
    categoryId: series.category_id ?? '',
    confirmationRequired: series.confirmation_required,
    description: series.description ?? '',
    effectiveFrom: series.effective_from,
    endAfterOccurrences: series.end_after_occurrences ?? undefined,
    endAt: series.end_at ?? undefined,
    endType: series.end_type,
    fixedAssigneeId: series.fixed_assignee_id ?? '',
    missedPolicy: series.missed_policy,
    recurrenceConfig: series.recurrence_config as TaskFormValues['recurrenceConfig'],
    recurrenceType: series.recurrence_type,
    rotationMemberIds: rotationMembers.filter((member) => member.is_active).sort((left, right) => left.rotation_position - right.rotation_position).map((member) => member.user_id),
    seriesType: series.series_type,
    slots: [...slots].sort((left, right) => left.sort_order - right.sort_order).map((slot) => ({
      endDayOffset: slot.end_day_offset as 0 | 1,
      endTime: normalizeDatabaseTime(slot.local_end_time),
      isAllDay: slot.is_all_day,
      startTime: normalizeDatabaseTime(slot.local_start_time),
    })),
    title: series.title,
  } as unknown as Partial<TaskFormValues>
}

export function TasksScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showForm, setShowForm] = useState(() => searchParams.get('new') === '1')
  const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null)
  const { session } = useSession()
  const queryClient = useQueryClient()
  const households = useQuery({
    queryKey: ['households'],
    queryFn: async () => {
      const { data, error } = await supabase.from('households').select('*').order('name')
      if (error) throw error
      return data
    },
  })
  const householdId = localStorage.getItem('hometeam.household-id') ?? households.data?.[0]?.id
  const series = useQuery({
    enabled: Boolean(householdId),
    queryKey: ['series', householdId],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_series').select('*').eq('household_id', householdId!).order('title')
      if (error) throw error
      return data
    },
  })
  const seriesIds = series.data?.map((task) => task.id) ?? []
  const slots = useQuery({
    enabled: seriesIds.length > 0,
    queryKey: ['task-slots', householdId, seriesIds],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_schedule_slots').select('*').in('series_id', seriesIds).order('sort_order')
      if (error) throw error
      return data
    },
  })
  const rotationMembers = useQuery({
    enabled: seriesIds.length > 0,
    queryKey: ['rotation-members', householdId, seriesIds],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_rotation_members').select('*').in('series_id', seriesIds).order('rotation_position')
      if (error) throw error
      return data
    },
  })
  const categories = useQuery({
    enabled: Boolean(householdId),
    queryKey: ['categories', householdId],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id, name').eq('household_id', householdId!).order('name')
      if (error) throw error
      return data
    },
  })
  const members = useQuery({ enabled: Boolean(householdId), queryKey: ['members', householdId], queryFn: () => listHouseholdMembers(supabase, householdId!) })
  const occurrences = useQuery({
    enabled: Boolean(householdId),
    queryKey: ['occurrences', householdId],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_occurrences').select('*').eq('household_id', householdId!).eq('lifecycle_state', 'open').order('original_due_start').limit(20)
      if (error) throw error
      return data
    },
  })

  const editingSeries = series.data?.find((task) => task.id === editingSeriesId)
  const editingInitialValue = editingSeries
    ? initialTaskValues(editingSeries, (slots.data ?? []).filter((slot) => slot.series_id === editingSeries.id), (rotationMembers.data ?? []).filter((member) => member.series_id === editingSeries.id))
    : undefined

  function closeForm() {
    setShowForm(false)
    setEditingSeriesId(null)
    if (searchParams.has('new')) {
      const next = new URLSearchParams(searchParams)
      next.delete('new')
      setSearchParams(next, { replace: true })
    }
  }
  function openNewTask() {
    setEditingSeriesId(null)
    setShowForm(true)
  }
  function openEditTask(seriesId: string) {
    setEditingSeriesId(seriesId)
    setShowForm(true)
  }
  async function refreshTaskViews() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['series', householdId] }),
      queryClient.invalidateQueries({ queryKey: ['task-slots', householdId] }),
      queryClient.invalidateQueries({ queryKey: ['rotation-members', householdId] }),
      queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
      queryClient.invalidateQueries({ queryKey: ['upcoming'] }),
      queryClient.invalidateQueries({ queryKey: ['history', householdId] }),
    ])
  }
  async function refreshAssignments() { await queryClient.invalidateQueries({ queryKey: ['occurrences', householdId] }) }

  if (households.isPending) return <section className="page-stack"><LoadingState label="Loading your household…" /></section>
  if (!householdId) return <section className="page-stack"><PageHeader description="Set up a household before creating shared tasks." eyebrow="Task library" title="Tasks" /><EmptyState description="Create a household from More, then come back to build your shared task list." icon="home" title="A household comes first" /></section>
  const canManageAssignments = members.data?.some((member) => member.userId === session?.user.id && member.role === 'full_member') ?? false
  const categoryNames = new Map((categories.data ?? []).map((category) => [category.id, category.name]))

  return (
    <section className="page-stack">
      <PageHeader
        action={<Button onClick={() => showForm ? closeForm() : openNewTask()} variant={showForm ? 'secondary' : 'primary'}>{showForm ? 'Close' : <><Icon name="plus" size={18} /> New task</>}</Button>}
        description="Create routines, assign them clearly, and keep the household in sync."
        eyebrow={households.data?.find((item) => item.id === householdId)?.name}
        title="Tasks"
      />
      {showForm && (
        <div className="mb-7">
          {editingSeriesId && (slots.isPending || rotationMembers.isPending)
            ? <LoadingState label="Loading task details…" />
            : <TaskForm
                categories={categories.data ?? []}
                currentUserId={session?.user.id}
                formTitle={editingSeriesId ? 'Edit task' : 'New household task'}
                initialValue={editingInitialValue}
                key={editingSeriesId ?? 'new-task'}
                members={members.data ?? []}
                onCancel={closeForm}
                onSave={async (values) => {
                  const saved = await saveTaskSeries(supabase, { ...values, householdId, ...(editingSeriesId ? { id: editingSeriesId } : {}) })
                  if (values.assignmentMode === 'round_robin') await replaceRotationRoster(supabase, saved.id, values.rotationMemberIds)
                  await refreshTaskViews()
                  closeForm()
                }}
                timeZone={households.data?.find((item) => item.id === householdId)?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
              />}
        </div>
      )}
      {series.isPending && <LoadingState label="Loading tasks…" />}
      {series.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{series.error.message}</p>}
      {!showForm && series.data?.length === 0 && <EmptyState action={<Button onClick={openNewTask}><Icon name="plus" size={18} /> Add first task</Button>} description="Add a one-time chore or a repeating household routine." icon="list" title="Build your shared list" />}
      <div className="space-y-2">{series.data?.map((task) => <TaskDetails categoryName={categoryNames.get(task.category_id ?? '')} key={task.id} onChanged={() => void refreshTaskViews()} onEdit={() => openEditTask(task.id)} series={task} />)}</div>

      <details className="settings-panel group mt-8">
        <summary className="settings-panel-header">
          <span className="settings-panel-icon"><Icon name="users" size={19} /></span>
          <span className="min-w-0 flex-1"><span className="settings-panel-title" id="open-assignments-heading">Open assignments</span><span className="settings-panel-description block">Review or reassign individual task occurrences</span></span>
          {occurrences.data && <span className="section-count">{occurrences.data.length}</span>}
          <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
        </summary>
        <div className="settings-panel-content border-t border-border pt-4">
          {occurrences.isError && <p className="text-sm text-danger" role="alert">{occurrences.error.message}</p>}
          {occurrences.data?.length === 0 && <p className="text-sm text-muted">No open assignments right now.</p>}
          <ul className="space-y-3">
            {occurrences.data?.map((occurrence) => <li className="rounded-panel bg-canvas p-4" key={occurrence.id}><div className="flex items-start gap-3"><span className="settings-panel-icon h-10 w-10 rounded-xl"><CategoryIcon categoryName={categoryNames.get(series.data?.find((task) => task.id === occurrence.series_id)?.category_id ?? '')} size={18} /></span><div className="min-w-0 flex-1"><h3 className="font-semibold">{series.data?.find((task) => task.id === occurrence.series_id)?.title ?? 'Task occurrence'}</h3><p className="mt-1 text-sm text-muted">Due {new Date(occurrence.original_due_start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div><div className="mt-3"><OccurrenceAssignmentControls canManage={canManageAssignments} members={members.data ?? []} occurrence={occurrence} onAssign={async (assigneeUserId, lock) => { await assignOccurrence(supabase, occurrence.id, assigneeUserId, occurrence.version, lock); await refreshAssignments() }} onClaim={async () => { await claimOccurrence(supabase, occurrence.id, occurrence.version); await refreshAssignments() }} onToggleLock={async (locked) => { await setOccurrenceAssignmentLock(supabase, occurrence.id, occurrence.version, locked); await refreshAssignments() }} /></div></li>)}
          </ul>
        </div>
      </details>
    </section>
  )
}
