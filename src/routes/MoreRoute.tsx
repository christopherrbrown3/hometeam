import { HouseholdSettingsScreen } from '../features/households/HouseholdSettingsScreen'
import { NotificationSettings } from '../features/notifications/NotificationSettings'
import { InstallSettings } from '../features/pwa/InstallSettings'
export function MoreRoute() { return <div className="space-y-6"><HouseholdSettingsScreen/><NotificationSettings/><InstallSettings/></div> }
