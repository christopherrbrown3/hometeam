import type { HouseholdMember } from '../households/membershipService'
import type { TaskFormValues } from './taskFormSchema'
import { RotationRosterEditor } from './RotationRosterEditor'

type AssignmentFieldsProps = Readonly<{
  currentUserId?: string
  members: readonly HouseholdMember[]
  onChange: (change: Partial<TaskFormValues>) => void
  values: Pick<TaskFormValues, 'assignmentMode' | 'fixedAssigneeId' | 'rotationMemberIds'>
}>

export function AssignmentFields({ currentUserId, members, onChange, values }: AssignmentFieldsProps) {
  const selected = values.assignmentMode === 'round_robin'
    ? 'round_robin'
    : values.assignmentMode === 'fixed' && values.fixedAssigneeId
      ? `member:${values.fixedAssigneeId}`
      : 'unassigned'

  function changeAssignment(value: string) {
    if (value === 'round_robin') {
      onChange({ assignmentMode: 'round_robin', fixedAssigneeId: '', rotationMemberIds: values.rotationMemberIds })
    } else if (value.startsWith('member:')) {
      onChange({ assignmentMode: 'fixed', fixedAssigneeId: value.slice('member:'.length), rotationMemberIds: [] })
    } else {
      onChange({ assignmentMode: 'unassigned', fixedAssigneeId: '', rotationMemberIds: [] })
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Who should do it?</legend>
      <select
        aria-label="Who should do it?"
        className="min-h-11 w-full rounded-control border border-border bg-surface px-3"
        onChange={(event) => changeAssignment(event.target.value)}
        value={selected}
      >
        {members.map((member) => <option key={member.userId} value={`member:${member.userId}`}>{member.displayName}{member.userId === currentUserId ? ' (you)' : ''}</option>)}
        <option value="unassigned">Leave unassigned</option>
        <option value="round_robin">Rotate between people</option>
      </select>
      {values.assignmentMode === 'round_robin' && <RotationRosterEditor members={members} onChange={(rotationMemberIds) => onChange({ rotationMemberIds })} selected={values.rotationMemberIds} />}
    </fieldset>
  )
}
