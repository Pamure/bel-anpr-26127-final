import React from 'react'
import { Menu, X, Search, Radar, Wifi, Database, AlertTriangle, Shield, Plus } from 'lucide-react'

interface HeaderProps {
  mode: 'trajectory' | 'live' | 'analytics' | 'alerts'
  onModeChange: (mode: 'trajectory' | 'live' | 'analytics' | 'alerts') => void
  selectedPlate: string
  onTrackPlate: (plate: string) => void
  cameras: any[]
  activeCamera: string
  onCameraSelect: (id: string) => void
  sidebarOpen: boolean
  onSidebarToggle: () => void
  onAddFeedClick?: () => void
}

const modes = [
  { id: 'trajectory', label: 'TRAJECTORY', icon: Radar, shortcut: '1' },
  { id: 'live', label: 'LIVE FEED', icon: Wifi, shortcut: '2' },
  { id: 'analytics', label: 'ANALYTICS', icon: Database, shortcut: '3' },
  { id: 'alerts', label: 'ALERTS', icon: AlertTriangle, shortcut: '4' },
]

export function Header({
  mode,
  onModeChange,
  selectedPlate,
  onTrackPlate,
  cameras,
  activeCamera,
  onCameraSelect,
  sidebarOpen,
  onSidebarToggle,
  onAddFeedClick,
}: HeaderProps) {
  const [plateInput, setPlateInput] = React.useState(selectedPlate)
  const [searchFocused, setSearchFocused] = React.useState(false)

  // Keep plateInput in sync with selectedPlate prop
  React.useEffect(() => {
    setPlateInput(selectedPlate)
  }, [selectedPlate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onTrackPlate(plateInput)
  }

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-[var(--border-standard)]" style={{ background: 'var(--bg-surface)' }}>
      {/* Left: Brand & Mode Tabs */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          onClick={onSidebarToggle}
          className="btn btn-ghost btn-icon p-2"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
          <span className="font-mono text-lg font-bold text-[var(--accent-primary)]">BEL ANPR</span>
          <span className="badge badge-info">26127</span>
        </div>

        <div className="flex items-center gap-1 bg-[var(--bg-primary)] rounded-md p-1 border border-[var(--border-standard)]">
          {modes.map(m => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                mode === m.id
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] shadow-[var(--shadow-glow)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
              title={`${m.label} (${m.shortcut})`}
            >
              <m.icon size={12} />
              <span className="hidden sm:inline">{m.label}</span>
              <kbd className="hidden xs:inline px-1.5 py-0.5 bg-[var(--bg-primary)] rounded text-[10px] font-mono">{m.shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>

      {/* Center: Plate Search */}
      <div className="flex-1 max-w-md mx-8">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input
            type="text"
            value={plateInput}
            onChange={e => setPlateInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Enter plate (e.g., DL01AB1234)..."
            className="input pl-10 pr-10 font-mono text-sm tracking-wider"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary btn-icon p-1.5"
            aria-label="Track plate"
          >
            <Radar size={14} />
          </button>
        </form>
      </div>

      {/* Right: System Status */}
      <div className="flex items-center gap-3">
        {/* Add Stream / Feed Ingest Button */}
        <button
          id="btn-add-feed"
          type="button"
          onClick={onAddFeedClick}
          className="btn btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 shadow-[var(--shadow-glow)]"
          title="Ingest live RTSP stream or upload video file"
        >
          <Plus size={14} />
          <span className="hidden sm:inline font-mono font-bold">ADD FEED</span>
        </button>

        {/* Camera Selector */}
        <div className="relative hidden lg:block">
          <select
            value={activeCamera}
            onChange={e => onCameraSelect(e.target.value)}
            className="input pl-8 pr-8 py-1.5 text-sm font-mono w-40 bg-[var(--bg-primary)] appearance-none cursor-pointer"
          >
            <option value="">ALL CAMERAS</option>
            {cameras.map((cam: any) => (
              <option key={cam.camera_id} value={cam.camera_id}>
                {cam.camera_id}
              </option>
            ))}
          </select>
          <Radar className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
        </div>

        {/* System Status Indicators */}
        <div className="flex items-center gap-3">
          <StatusIndicator label="DB" status="ok" />
          <StatusIndicator label="OSRM" status="ok" />
          <StatusIndicator label="ANPR" status="ok" />
        </div>
      </div>
    </header>
  )
}

function StatusIndicator({ label, status }: { label: string; status: 'ok' | 'warn' | 'error' }) {
  const colors = {
    ok: 'var(--accent-primary)',
    warn: 'var(--accent-warning)',
    error: 'var(--accent-critical)',
  }

  return (
    <div className="flex items-center gap-1.5" title={label}>
      <div 
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: colors[status], boxShadow: `0 0 8px ${colors[status]}` }}
      />
      <span className="font-mono text-xs text-[var(--text-muted)]">{label}</span>
    </div>
  )
}