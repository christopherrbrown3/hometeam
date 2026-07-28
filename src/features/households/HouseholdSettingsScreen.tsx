import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { InvitationsScreen } from './InvitationsScreen'
import { MembersScreen } from './MembersScreen'

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
    <main className="mx-auto max-w-2xl space-y-6">
      <section><p className="text-sm font-semibold text-brand">Your households</p><h1 className="text-2xl font-bold">Household settings</h1></section>
      {households.isPending && <p>Loading households…</p>}
      {households.isError && <p className="text-danger" role="alert">{households.error.message}</p>}
      {households.data && households.data.length > 0 && <section className="rounded-panel border border-border p-5"><label className="block text-sm font-semibold" htmlFor="household">Current household</label><select className="mt-2 min-h-11 w-full rounded-control border border-border bg-canvas px-3" id="household" onChange={(event) => selectHousehold(event.target.value)} value={selectedHousehold?.id ?? ''}>{households.data.map((household) => <option key={household.id} value={household.id}>{household.name} · {household.timezone}</option>)}</select>{selectedHousehold && <HouseholdManagement householdId={selectedHousehold.id} />}</section>}
      <form className="space-y-3 rounded-panel border border-border p-5" onSubmit={(event) => void createHousehold(event)}><h2 className="text-xl font-bold">Create a household</h2><label className="block text-sm font-semibold">Name<input className="mt-1 min-h-11 w-full rounded-control border border-border px-3" name="name" required /></label><label className="block text-sm font-semibold">Timezone<input className="mt-1 min-h-11 w-full rounded-control border border-border px-3" defaultValue={browserTimezone()} name="timezone" required /></label>{error && <p className="text-danger" role="alert">{error}</p>}<Button type="submit">Create household</Button></form>
    </main>
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

  return <div className="mt-6 space-y-6"><MembersScreen householdId={householdId} /><InvitationsScreen householdId={householdId} /><section><h2 className="text-lg font-bold">Categories</h2><form className="mt-2 flex gap-2" onSubmit={(event) => void createCategory(event)}><input className="min-h-11 flex-1 rounded-control border border-border px-3" name="category" placeholder="e.g. Pets" required/><Button type="submit">Add</Button></form><div className="mt-2 flex flex-wrap gap-2">{categories.data?.map((category) => <span className="rounded-full bg-surface-strong px-3 py-1 text-sm" key={category.id}>{category.name}</span>)}</div></section>{error && <p className="text-danger" role="alert">{error}</p>}</div>
}
