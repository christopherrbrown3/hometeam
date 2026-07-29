import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useSession } from '../auth/useSession'
import { Icon } from '../../components/ui/Icon'

export function NotificationSettings() {
  const { session } = useSession()
  const query = useQuery({ enabled: Boolean(session), queryKey: ['notification-preferences', session?.user.id], queryFn: async () => { const { data, error } = await supabase.from('notification_preferences').select('*').eq('user_id', session!.user.id).maybeSingle(); if (error) throw error; return data } })
  return (
    <section className="settings-panel">
      <div className="settings-panel-header cursor-default">
        <span className="settings-panel-icon"><Icon name="clock" size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="settings-panel-title">Notifications</span>
          <span className="settings-panel-description block">{query.isPending ? 'Loading preferences…' : query.data ? `Due-soon reminder · ${query.data.due_soon_minutes} minutes` : 'Available after notification setup'}</span>
        </span>
      </div>
    </section>
  )
}
