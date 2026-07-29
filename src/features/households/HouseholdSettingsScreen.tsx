import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { InvitationsScreen } from './InvitationsScreen'
import { MembersScreen } from './MembersScreen'
import { Icon } from '../../components/ui/Icon'
import { LoadingState } from '../../components/ui/LoadingState'

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function HouseholdSettingsScreen() {
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(() => localStorage.getItem('hometeam.household-id'))
  const [error, setError] = useState<string | null>(null)
  const households = useQuery({
    queryKey: ['households'],
    queryFn: async () => {
      const { data, error: requestError } = await supabase.from('households').select('*').order('name')
      if (requestError) throw requestError
      return data
    },
  })
  const selectedHousehold = households.data?.find((household) => household.id === currentHouseholdId) ?? households.data?.[0] ?? null

  function selectHousehold(householdId: string) {
    localStorage.setItem('hometeam.household-id', householdId)
    setCurrentHouseholdId(householdId)
  }

  async function createHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError(null)
    const { data, error: requestError } = await supabase.rpc('create_household', {
      input_name: String(form.get('name') ?? ''), input_timezone: String(form.get('timezone') ?? browserTimezone()),
    })
    if (requestError || !data) { setError(requestError?.message ?? 'We could not create that household.'); return }
    await households.refetch()
    selectHousehold(data.id)
    event.currentTarget.reset()
  }

  return (
    <>
      {households.isPending && <LoadingState label="Loading households…" rows={1} />}
      {households.isError && <p className="rounded-control bg-danger/10 p-3 text-sm text-danger" role="alert">{households.error.message}</p>}
      {households.data && households.data.length > 0 && (
        <>
          <section className="settings-panel">
            <div className="p-4">
              <div className="mb-3 flex items-center gap-3">
                <span className="settings-panel-icon"><Icon name="home" size={19} /></span>
                <div><h2 className="settings-panel-title">Household</h2><p className="settings-panel-description">Choose the home you’re managing</p></div>
              </div>
              <label className="sr-only" htmlFor="household">Current household</label>
              <select className="min-h-11 w-full rounded-control border px-3" id="household" onChange={(event) => selectHousehold(event.target.value)} value={selectedHousehold?.id ?? ''}>{households.data.map((household) => <option key={household.id} value={household.id}>{household.name} · {household.timezone}</option>)}</select>
            </div>
          </section>
          {selectedHousehold && <HouseholdManagement householdId={selectedHousehold.id} />}
        </>
      )}
      <details className="settings-panel group" open={households.data?.length === 0}>
        <summary className="settings-panel-header">
          <span className="settings-panel-icon"><Icon name="plus" size={19} /></span>
          <span className="min-w-0 flex-1"><span className="settings-panel-title">Create another household</span><span className="settings-panel-description block">Start a separate home task list</span></span>
          <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
        </summary>
        <form className="settings-panel-content space-y-3 border-t border-border pt-4" onSubmit={(event) => void createHousehold(event)}>
          <label className="block text-sm font-semibold">Name<input className="mt-1 min-h-11 w-full rounded-control border px-3" name="name" placeholder="e.g. Maple Home" required /></label>
          <label className="block text-sm font-semibold">Timezone<input className="mt-1 min-h-11 w-full rounded-control border px-3" defaultValue={browserTimezone()} name="timezone" required /></label>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <Button type="submit">Create household</Button>
        </form>
      </details>
    </>
  )
}

function HouseholdManagement({ householdId }: Readonly<{ householdId: string }>) {
  const [error, setError] = useState<string | null>(null)
  const categories = useQuery({ queryKey: ['categories', householdId], queryFn: async () => { const { data, error: requestError } = await supabase.from('categories').select('*').eq('household_id', householdId).order('name'); if (requestError) throw requestError; return data } })

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const { error: requestError } = await supabase.rpc('create_category', { input_household_id: householdId, input_name: String(form.get('category')) })
    if (requestError) { setError(requestError.message); return }
    await categories.refetch()
    event.currentTarget.reset()
  }

  return (
    <>
      <details className="settings-panel group">
        <summary className="settings-panel-header">
          <span className="settings-panel-icon"><Icon name="users" size={19} /></span>
          <span className="min-w-0 flex-1"><span className="settings-panel-title">Members</span><span className="settings-panel-description block">People who share this household</span></span>
          <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
        </summary>
        <div className="settings-panel-content border-t border-border pt-4"><MembersScreen householdId={householdId} /></div>
      </details>
      <details className="settings-panel group">
        <summary className="settings-panel-header">
          <span className="settings-panel-icon"><Icon name="inbox" size={19} /></span>
          <span className="min-w-0 flex-1"><span className="settings-panel-title">Invitations</span><span className="settings-panel-description block">Invite someone with a private link</span></span>
          <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
        </summary>
        <div className="settings-panel-content border-t border-border pt-4"><InvitationsScreen householdId={householdId} /></div>
      </details>
      <details className="settings-panel group">
        <summary className="settings-panel-header">
          <span className="settings-panel-icon"><Icon name="list" size={19} /></span>
          <span className="min-w-0 flex-1"><span className="settings-panel-title">Categories</span><span className="settings-panel-description block">Organize tasks into simple groups</span></span>
          <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
        </summary>
        <section className="settings-panel-content border-t border-border pt-4">
          <form className="flex gap-2" onSubmit={(event) => void createCategory(event)}><input aria-label="New category" className="min-h-11 min-w-0 flex-1 rounded-control border px-3" name="category" placeholder="e.g. Pets" required /><Button type="submit">Add</Button></form>
          <div className="mt-3 flex flex-wrap gap-2">{categories.data?.map((category) => <span className="rounded-full bg-surface-strong px-3 py-1 text-sm font-medium text-muted" key={category.id}>{category.name}</span>)}</div>
          {error && <p className="mt-3 text-sm text-danger" role="alert">{error}</p>}
        </section>
      </details>
    </>
  )
}
