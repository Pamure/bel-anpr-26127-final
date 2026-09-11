import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Camera, MapPin, Target, Filter, Clock, AlertTriangle, Eye, Download } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  mode: 'trajectory' | 'live' | 'analytics' | 'alerts'
  selectedPlate: string
  onTrackPlate: (plate: string) => void
  trajectoryData: any
  detections: any[]
  cameras: any[]
  activeCamera: string
  onCameraSelect: (id: string) => void
  onDetectionClick: (detection: any) => void
  alerts: any[]
  onShowPlateCrops: (plate: string, crops: any[]) => void
}

export function Sidebar({
  isOpen,
  mode,
  selectedPlate,
  onTrackPlate,
  trajectoryData,
  detections,
  cameras,
  activeCamera,
  onCameraSelect,
  onDetectionClick,
  alerts,
  onShowPlateCrops,
}: SidebarProps) {
  const [cameraFilter, setCameraFilter] = useState<string>('')
  const [timeFilter, setTimeFilter] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [expandedSections, setExpandedSections] = useState({
    cameras: true,
    filters: true,
    trajectory: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (!isOpen) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 flex items-center justify-center border-b border-[var(--border-standard)]">
          <Camera className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cameras.slice(0, 8).map((cam: any) => (
            <button
              key={cam.camera_id}
              onClick={() => onCameraSelect(cam.camera_id)}
              className={`w-full p-2 rounded text-xs font-mono transition-colors ${
                activeCamera === cam.camera_id
                  ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
              title={cam.label}
            >
              {cam.camera_id}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden animate-slide-in">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-standard)]">
        <h2 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
          CONTROL PANEL
        </h2>
        
        {/* Plate Search */}
        <form onSubmit={e => { e.preventDefault(); onTrackPlate(selectedPlate) }} className="mb-4">
          <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">TARGET PLATE</label>
          <div className="relative">
            <input
              type="text"
              value={selectedPlate}
              onChange={e => onTrackPlate(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="DL01AB1234"
              className="input font-mono text-sm tracking-wider pl-8"
            />
            <Target className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
          </div>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Camera Section */}
        <Section title="CAMERAS" icon={Camera} expanded={expandedSections.cameras} onToggle={() => toggleSection('cameras')}>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {Array.from(new Map(cameras.map((c: any) => [c.camera_id, c])).values()).map((cam: any) => (
              <button
                key={cam.camera_id}
                onClick={() => onCameraSelect(cam.camera_id)}
                className={`w-full text-left p-2 rounded text-xs transition-colors flex items-center gap-2 ${
                  activeCamera === cam.camera_id
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="font-mono flex-1 truncate">{cam.camera_id}</span>
                {activeCamera === cam.camera_id && (
                  <span className="badge badge-success text-[10px]">ACTIVE</span>
                )}
              </button>
            ))}
            {cameras.length === 0 && (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">No cameras configured</p>
            )}
          </div>
        </Section>

        {/* Filters Section */}
        <Section title="FILTERS" icon={Filter} expanded={expandedSections.filters} onToggle={() => toggleSection('filters')}>
          <div className="space-y-3">
            {/* Camera Filter */}
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">CAMERA</label>
              <select
                value={cameraFilter}
                onChange={e => setCameraFilter(e.target.value)}
                className="input text-xs"
              >
                <option value="">ALL CAMERAS</option>
                {cameras.map((cam: any) => (
                  <option key={cam.camera_id} value={cam.camera_id}>{cam.camera_id}</option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">START</label>
                <input
                  type="datetime-local"
                  value={timeFilter.start}
                  onChange={e => setTimeFilter(prev => ({ ...prev, start: e.target.value }))}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">END</label>
                <input
                  type="datetime-local"
                  value={timeFilter.end}
                  onChange={e => setTimeFilter(prev => ({ ...prev, end: e.target.value }))}
                  className="input text-xs"
                />
              </div>
            </div>

            {/* Confidence Threshold */}
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">MIN CONFIDENCE</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={0.5}
                className="w-full h-1.5 bg-[var(--bg-primary)] rounded-lg appearance-none accent-[var(--accent-primary)]"
              />
            </div>
          </div>
        </Section>

        {/* Trajectory Info */}
        {mode === 'trajectory' && trajectoryData && (
          <Section title="TRAJECTORY" icon={Target} expanded={expandedSections.trajectory} onToggle={() => toggleSection('trajectory')}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="badge badge-success">VERIFIED</span>
                <PlateBadge plate={trajectoryData.plate} />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-[var(--text-muted)]">SIGHTINGS</div>
                  <div className="font-mono text-lg">{trajectoryData.sightings_count}</div>
                </div>
                <div>
                  <div className="text-[var(--text-muted)]">MODE</div>
                  <div className="font-mono capitalize">{trajectoryData.mode}</div>
                </div>
              </div>

              {trajectoryData.osrm_match && (
                <div className="p-2 bg-[var(--bg-primary)] rounded border border-[var(--border-standard)]">
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="badge badge-info">OSRM MATCH</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-[var(--text-muted)]">DISTANCE</span><br/><span className="font-mono">{(trajectoryData.osrm_match.distance / 1000).toFixed(1)} km</span></div>
                    <div><span className="text-[var(--text-muted)]">DURATION</span><br/><span className="font-mono">{(trajectoryData.osrm_match.duration / 60).toFixed(0)} min</span></div>
                    <div><span className="text-[var(--text-muted)]">CONFIDENCE</span><br/><span className="font-mono">{(trajectoryData.osrm_match.confidence * 100).toFixed(1)}%</span></div>
                    <div><span className="text-[var(--text-muted)]">AVG SPEED</span><br/><span className="font-mono">{(trajectoryData.osrm_match.distance / trajectoryData.osrm_match.duration * 3.6).toFixed(0)} km/h</span></div>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <Section title="ACTIVE ALERTS" icon={AlertTriangle} expanded={true} onToggle={() => {}}>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {alerts.slice(0, 10).map((alert: any, idx: number) => (
                <div key={idx} className={`p-2 rounded border-l-3 text-xs ${
                  alert.alert_type === 'BLACKLIST_MATCH'
                    ? 'border-[var(--accent-critical)] bg-[rgba(255,51,75,0.1)]'
                    : 'border-[var(--accent-warning)] bg-[rgba(255,176,32,0.1)]'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[var(--accent-critical)]">{alert.plate_normalized}</span>
                    <span className={`badge ${alert.alert_type === 'BLACKLIST_MATCH' ? 'badge-critical' : 'badge-warning'} text-[10px]`}>
                      {alert.alert_type}
                    </span>
                  </div>
                  <p className="text-[var(--text-secondary)] truncate">{alert.details?.reason || 'Impossible travel detected'}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--text-muted)]">
                    <Clock size={10} />
                    <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-standard)]">
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
            SYSTEM ONLINE
          </span>
          <span className="flex-1 text-right font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, expanded, onToggle, children }: any) {
  return (
    <div className="border border-[var(--border-standard)] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors"
      >
        <Icon className="w-4 h-4 text-[var(--accent-primary)]" />
        <span className="font-mono text-xs text-[var(--text-secondary)] uppercase tracking-wider flex-1">{title}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div className="p-3">{children}</div>}
    </div>
  )
}

function PlateBadge({ plate }: { plate: string }) {
  return (
    <span className="flex-1 text-right font-mono text-sm tracking-widest text-[var(--accent-primary)] bg-[var(--bg-primary)] px-2 py-1 rounded border border-[var(--accent-primary)]/30">
      {plate}
    </span>
  )
}