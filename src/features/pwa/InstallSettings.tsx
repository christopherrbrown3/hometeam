import { Icon } from '../../components/ui/Icon'

export function InstallSettings() {
  return (
    <details className="settings-panel group">
      <summary className="settings-panel-header">
        <span className="settings-panel-icon"><Icon name="home" size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="settings-panel-title">Install HomeTeam</span>
          <span className="settings-panel-description block">Keep it handy on your home screen</span>
        </span>
        <Icon className="text-muted transition-transform duration-200 group-open:rotate-90" name="chevron-right" size={18} />
      </summary>
      <div className="settings-panel-content border-t border-border pt-4">
        <p className="text-sm text-muted">Open your browser menu and choose “Add to Home Screen” for quick access.</p>
      </div>
    </details>
  )
}
