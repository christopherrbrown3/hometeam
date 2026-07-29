import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { PageHeader } from '../components/ui/PageHeader'
import { getCurrentAccess } from '../features/access/accessService'
import { signOut } from '../features/auth/authService'
import { useSession } from '../features/auth/useSession'
import { HouseholdSettingsScreen } from '../features/households/HouseholdSettingsScreen'
import { NotificationSettings } from '../features/notifications/NotificationSettings'
import { InstallSettings } from '../features/pwa/InstallSettings'
import { supabase } from '../lib/supabase'

export function MoreRoute() {
  const { session } = useSession()
  const [error, setError] = useState<string | null>(null)
  const access = useQuery({
    enabled: Boolean(session),
    queryFn: () => getCurrentAccess(supabase),
    queryKey: ['current-access', session?.user.id],
    staleTime: Infinity,
  })

  async function handleSignOut() {
    setError(null)
    const result = await signOut(supabase)
    if (!result.ok) setError(result.error.message)
  }

  return (
    <section className="page-stack">
      <PageHeader description="Household, app, and account preferences." eyebrow="Settings" title="More" />
      <div className="space-y-3">
        <HouseholdSettingsScreen />
        <NotificationSettings />
        <InstallSettings />
        <details className="settings-panel group">
          <summary className="settings-panel-header">
            <span className="settings-panel-icon"><Icon name="user" size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="settings-panel-title">Account</span>
              <span className="settings-panel-description block">Access and sign-in controls</span>
            </span>
            <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
          </summary>
          <div className="settings-panel-content space-y-3 border-t border-border pt-4">
            {access.data?.isAdministrator && <Link className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand hover:underline" to="/admin/access"><Icon name="lock" size={17} /> Review access requests</Link>}
            <div><Button onClick={() => void handleSignOut()} variant="secondary">Sign out</Button></div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          </div>
        </details>
      </div>
    </section>
  )
}
