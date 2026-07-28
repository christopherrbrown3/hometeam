import type { HouseholdMember } from '../households/membershipService'
import type { TaskFormValues } from './taskFormSchema'
import { RotationRosterEditor } from './RotationRosterEditor'

type AssignmentFieldsProps = Readonly<{
  members: readonly HouseholdMember[]
  onChange: (change: Partial<TaskFormValues>) => void
  values: Pick<TaskFormValues, 'assignmentMode' | 'fixedAssigneeId' | 'rotationMemberIds'>
}>

export function AssignmentFields({ members, onChange, values }: AssignmentFieldsProps) {
  return <fieldset className="space-y-3"><legend className="text-sm font-semibold">Assignment</legend><label className="block text-sm font-semibold">Mode<select className="mt-1 min-h-11 w-full rounded-control border border-border bg-canvas px-3" onChange={(event) => onChange({ assignmentMode: event.target.value as TaskFormValues['assignmentMode'], fixedAssigneeId: '', rotationMemberIds: event.target.value === 'round_robin' ? values.rotationMemberIds : [] })} value={values.assignmentMode}><option value="unassigned">Unassigned</option><option value="fixed">Fixed person</option><option value="round_robin">Round robin</option></select></label>{values.assignmentMode === 'fixed' && <label className="block text-sm font-semibold">Assigned to<select className="mt-1 min-h-11 w-full rounded-control border border-border bg-canvas px-3" onChange={(event) => onChange({ fixedAssigneeId: event.target.value })} value={values.fixedAssigneeId}><option value="">Choose a household member</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName} ({member.role === 'guest' ? 'Guest' : 'Member'})</option>)}</select></label>}{values.assignmentMode === 'round_robin' && <RotationRosterEditor members={members} onChange={(rotationMemberIds) => onChange({ rotationMemberIds })} selected={values.rotationMemberIds} />}</fieldset>
}
