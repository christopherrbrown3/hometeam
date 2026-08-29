import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '../../types/database'
import { requireOnline } from '../pwa/onlineState'

type HomeTeamClient = SupabaseClient<Database>

export const notificationPreferencesInputSchema = z.object({
  due_soon_minutes: z.union([z.literal(5), z.literal(15), z.literal(30), z.literal(60)]),
  notify_assigned: z.boolean(),
  notify_completed: z.boolean(),
  notify_due_soon: z.boolean(),
  notify_membership_changes: z.boolean(),
  notify_new_task: z.boolean(),
  notify_overdue: z.boolean(),
  notify_skipped: z.boolean(),
  notify_snoozed: z.boolean(),
  show_task_details: z.boolean(),
})

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesInputSchema>
export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row']

export const defaultNotificationPreferences: NotificationPreferencesInput = {
  due_soon_minutes: 30,
  notify_assigned: true,
  notify_completed: true,
  notify_due_soon: true,
  notify_membership_changes: true,
  notify_new_task: true,
  notify_overdue: true,
  notify_skipped: true,
  notify_snoozed: true,
  show_task_details: true,
}

const preferenceColumns = 'created_at, due_soon_minutes, notify_assigned, notify_completed, notify_due_soon, notify_membership_changes, notify_new_task, notify_overdue, notify_skipped, notify_snoozed, show_task_details, updated_at, user_id' as const

export async function getNotificationPreferences(client: HomeTeamClient, userId: string): Promise<NotificationPreferences> {
  const { data, error } = await client
    .from('notification_preferences')
    .select(preferenceColumns)
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}

export async function saveNotificationPreferences(
  client: HomeTeamClient,
  userId: string,
  input: NotificationPreferencesInput,
): Promise<NotificationPreferences> {
  requireOnline()
  const preferences = notificationPreferencesInputSchema.parse(input)
  const { data, error } = await client
    .from('notification_preferences')
    .upsert({ ...preferences, user_id: userId }, { onConflict: 'user_id' })
    .select(preferenceColumns)
    .single()
  if (error) throw error
  return data
}
