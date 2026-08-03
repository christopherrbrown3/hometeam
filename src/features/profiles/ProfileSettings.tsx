import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { queryKeys } from '../../lib/queryKeys'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { isProfileColor, profileColorOptions, type ProfileColor } from './profileColors'
import { getProfile, updateProfileColor } from './profileService'

export function ProfileSettings() {
  const { session } = useSession()
  const queryClient = useQueryClient()
  const [selectedColor, setSelectedColor] = useState<ProfileColor | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<Readonly<{ kind: 'error' | 'success'; text: string }> | null>(null)
  const profile = useQuery({
    enabled: Boolean(session),
    queryFn: () => getProfile(supabase, session!.user.id),
    queryKey: session ? queryKeys.profile(session.user.id) : ['profile', 'signed-out'],
  })

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !selectedColor) return
    setSaving(true)
    setMessage(null)
    try {
      const updated = await updateProfileColor(supabase, session.user.id, selectedColor)
      queryClient.setQueryData(queryKeys.profile(session.user.id), updated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['household-members'] }),
        queryClient.invalidateQueries({ queryKey: ['occurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['upcoming'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ])
      setMessage({ kind: 'success', text: `${profileColorOptions.find(({ value }) => value === selectedColor)?.label ?? 'Profile'} saved.` })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'We could not save that color.' })
    } finally {
      setSaving(false)
    }
  }

  const currentColor = selectedColor ?? profile.data?.profile_color ?? 'blue'

  return (
    <details className="settings-panel group">
      <summary className="settings-panel-header">
        <span className="profile-color-mark" data-profile-color={currentColor}><Icon name="user" size={19} weight="duotone" /></span>
        <span className="min-w-0 flex-1">
          <span className="settings-panel-title">Profile</span>
          <span className="settings-panel-description block">Choose the color used for tasks assigned to you</span>
        </span>
        <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
      </summary>
      <form className="settings-panel-content border-t border-border pt-4" onSubmit={(event) => void save(event)}>
        {profile.isPending && <p className="text-sm text-muted">Loading your profile…</p>}
        {profile.isError && <p className="text-sm text-danger" role="alert">{profile.error.message}</p>}
        {profile.data && (
          <>
            <div className="mb-4">
              <p className="font-semibold">{profile.data.display_name}</p>
              <p className="text-sm text-muted">@{profile.data.username}</p>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Your task color</legend>
              <div className="grid grid-cols-2 gap-2">
                {profileColorOptions.map((option) => (
                  <label className="profile-color-choice" key={option.value}>
                    <input
                      checked={currentColor === option.value}
                      className="sr-only"
                      name="profile-color"
                      onChange={(event) => { if (isProfileColor(event.target.value)) { setSelectedColor(event.target.value); setMessage(null) } }}
                      type="radio"
                      value={option.value}
                    />
                    <span className="profile-color-swatch" data-profile-color={option.value}><Icon name="check" size={15} weight="bold" /></span>
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-3 text-xs leading-relaxed text-muted">Gray is reserved for tasks that are not assigned to anyone.</p>
            <div className="mt-4 flex items-center gap-3">
              <Button disabled={saving || currentColor === profile.data.profile_color} type="submit">{saving ? 'Saving…' : 'Save color'}</Button>
              {message && <p className={`text-sm ${message.kind === 'error' ? 'text-danger' : 'text-muted'}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p>}
            </div>
          </>
        )}
      </form>
    </details>
  )
}
