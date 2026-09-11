import React, { useEffect, useState, useRef } from 'react'
import { AlertTriangle, Shield, Clock, MapPin, Zap, X, Filter, Bell, Volume2, VolumeX, CheckCircle } from 'lucide-react'

interface AlertMonitorProps {
  alerts: any[]
}

type AlertType = 'BLACKLIST_MATCH' | 'IMPOSSIBLE_TRAVEL' | 'GEOFENCE_ENTER' | 'GEOFENCE_EXIT'

interface AlertFilters {
  types: AlertType[]
  acknowledged: boolean
  timeRange: number // hours
}

const ALERT_CONFIG = {
  BLACKLIST_MATCH: { label: 'BLACKLIST', color: '#FF334B', icon: Shield, bg: 'rgba(255,51,75,0.1)', border: '#FF334B', sound: true },
  IMPOSSIBLE_TRAVEL: { label: 'IMPOSSIBLE TRAVEL', color: '#FFB020', icon: Zap, bg: 'rgba(255,176,32,0.1)', border: '#FFB020', sound: false },
  GEOFENCE_ENTER: { label: 'GEOFENCE ENTRY', color: '#00B4D8', icon: MapPin, bg: 'rgba(0,180,216,0.1)', border: '#00B4D8', sound: false },
  GEOFENCE_EXIT: { label: 'GEOFENCE EXIT', color: '#00E599', icon: MapPin, bg: 'rgba(0,229,153,0.1)', border: '#00E599', sound: false },
}

export function AlertMonitor({ alerts }: AlertMonitorProps) {
  const [filters, setFilters] = useState<AlertFilters>({
    types: ['BLACKLIST_MATCH', 'IMPOSSIBLE_TRAVEL', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT'],
    acknowledged: false,
    timeRange: 24,
  })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<number>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastAlertCount = useRef(0)

  // Initialize audio context (guarded: invalid data URIs / no audio device must not crash the view)
  useEffect(() => {
    try {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hV0pG')
      audioRef.current.volume = 0.3
    } catch (e) {
      audioRef.current = null
    }
  }, [])

  // Play alert sound for new critical alerts
  useEffect(() => {
    if (!soundEnabled || !audioRef.current) return

    const criticalAlerts = alerts.filter(a => 
      ALERT_CONFIG[a.alert_type as AlertType]?.sound && 
      !acknowledgedIds.has(a.id)
    )

    if (criticalAlerts.length > lastAlertCount.current) {
      audioRef.current.play().catch(() => {})
    }
    lastAlertCount.current = criticalAlerts.length
  }, [alerts, soundEnabled, acknowledgedIds])

  // Filter alerts
  const filteredAlerts = alerts
    .filter(a => filters.types.includes(a.alert_type as AlertType))
    .filter(a => filters.acknowledged || !acknowledgedIds.has(a.id))
    .filter(a => {
      const alertTime = new Date(a.created_at).getTime()
      const cutoff = Date.now() - filters.timeRange * 60 * 60 * 1000
      return alertTime >= cutoff
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const handleAcknowledge = (id: number) => {
    setAcknowledgedIds(prev => new Set(prev).add(id))
  }

  const handleAcknowledgeAll = () => {
    filteredAlerts.forEach(a => setAcknowledgedIds(prev => new Set(prev).add(a.id)))
  }

  const handleClearFilters = () => {
    setFilters({ types: ['BLACKLIST_MATCH', 'IMPOSSIBLE_TRAVEL', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT'], acknowledged: false, timeRange: 24 })
  }

  // Stats
  const criticalCount = filteredAlerts.filter(a => a.alert_type === 'BLACKLIST_MATCH').length
  const warningCount = filteredAlerts.filter(a => a.alert_type === 'IMPOSSIBLE_TRAVEL').length
  const infoCount = filteredAlerts.filter(a => a.alert_type.startsWith('GEOFENCE')).length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-standard)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">THREAT MONITOR</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={e => setSoundEnabled(e.target.checked)}
                className="w-4 h-4 accent-[var(--accent-primary)] rounded"
              />
              <Volume2 className="w-4 h-4 text-[var(--text-muted)]" />
            </label>
            <button onClick={handleClearFilters} className="btn btn-ghost btn-icon p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)]" title="Clear filters">
              <Filter size={14} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <StatBadge count={criticalCount} label="CRITICAL" color="#FF334B" icon={Shield} />
          <StatBadge count={warningCount} label="WARNING" color="#FFB020" icon={Zap} />
          <StatBadge count={infoCount} label="INFO" color="#00B4D8" icon={MapPin} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(['BLACKLIST_MATCH', 'IMPOSSIBLE_TRAVEL', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT'] as AlertType[]).map(type => {
            const config = ALERT_CONFIG[type]
            return (
              <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.types.includes(type)}
                  onChange={e => setFilters(prev => ({
                    ...prev,
                    types: e.target.checked 
                      ? [...prev.types, type]
                      : prev.types.filter(t => t !== type)
                  }))}
                  className="w-3 h-3 accent-[var(--accent-primary)] rounded"
                />
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${filters.types.includes(type) ? 'text-[var(--bg-primary)]' : 'text-[var(--text-secondary)]'}`} style={{ background: filters.types.includes(type) ? config.color : config.bg, border: `1px solid ${config.border}` }}>
                  {config.label}
                </span>
              </label>
            )
          })}
          <label className="flex items-center gap-1.5 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={filters.acknowledged}
              onChange={e => setFilters(prev => ({ ...prev, acknowledged: e.target.checked }))}
              className="w-3 h-3 accent-[var(--accent-primary)] rounded"
            />
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] bg-[var(--bg-primary)] border border-[var(--border-standard)]">
              SHOW ACKNOWLEDGED
            </span>
          </label>
          <select
            value={filters.timeRange}
            onChange={e => setFilters(prev => ({ ...prev, timeRange: Number(e.target.value) }))}
            className="input text-xs py-1.5 w-auto ml-2"
          >
            <option value={1}>1h</option>
            <option value={6}>6h</option>
            <option value={12}>12h</option>
            <option value={24}>24h</option>
            <option value={48}>48h</option>
          </select>
        </div>
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Bell className="w-12 h-12 text-[var(--text-muted)] opacity-30" />
            <p className="mt-4 text-[var(--text-muted)]">No alerts in current filter</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">System nominal</p>
          </div>
        ) : (
          <>
            {criticalCount > 0 && (
              <div className="px-2 py-1">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[var(--accent-critical)] mb-2">
                  <Zap className="w-3 h-3 animate-pulse" />
                  CRITICAL ALERTS
                </div>
              </div>
            )}
            {filteredAlerts.map((alert, idx) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                index={idx}
                acknowledged={acknowledgedIds.has(alert.id)}
                onAcknowledge={handleAcknowledge}
                config={ALERT_CONFIG[alert.alert_type as AlertType] || ALERT_CONFIG.IMPOSSIBLE_TRAVEL}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-standard)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--text-muted)]">
            <span>{filteredAlerts.length} alerts in view</span>
            <span>{acknowledgedIds.size} acknowledged</span>
          </div>
          {acknowledgedIds.size > 0 && (
            <button 
              onClick={handleAcknowledgeAll}
              className="btn btn-secondary text-xs"
            >
              ACKNOWLEDGE ALL ({acknowledgedIds.size})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBadge({ count, label, color, icon: Icon }: any) {
  return (
    <div className="p-3 rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}33` }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="font-mono text-xs text-[var(--text-muted)] uppercase">{label}</span>
      </div>
      <div className="font-mono text-2xl" style={{ color }}>{count}</div>
    </div>
  )
}

interface AlertCardProps {
  alert: any
  index: number
  acknowledged: boolean
  onAcknowledge: (id: number) => void
  config: any
}

function AlertCard({ alert, index, acknowledged, onAcknowledge, config }: AlertCardProps) {
  const timeAgo = getTimeAgo(alert.created_at)

  return (
    <div 
      className={`relative p-3 rounded-lg border-l-4 transition-all ${
        acknowledged 
          ? 'opacity-50 bg-[var(--bg-primary)]' 
          : `bg-[${config.bg}] border-[${config.border}]`
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {acknowledged && (
        <div className="absolute top-2 right-2">
          <span className="badge badge-success text-[10px]">ACKNOWLEDGED</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <config.icon className="w-5 h-5" style={{ color: config.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge text-[10px] font-mono" style={{ background: config.bg, color: config.color, borderColor: config.border }}>
              {config.label}
            </span>
            <span className="font-mono text-sm" style={{ color: config.color }}>
              {alert.plate_normalized}
            </span>
            <span className="text-[var(--text-muted)] text-xs">{timeAgo}</span>
          </div>

          <p className="text-sm text-[var(--text-secondary)] mb-2">
            {alert.details?.reason || 
             `Speed: ${alert.details?.speed_kmh} km/h • Distance: ${alert.details?.distance_km} km • Gap: ${alert.details?.time_gap_minutes} min` ||
             'Anomaly detected'}
          </p>

          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {alert.details?.from_camera} → {alert.details?.to_camera}
            </span>
            {alert.details?.speed_kmh && (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {alert.details.speed_kmh} km/h
              </span>
            )}
          </div>
        </div>

        {!acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="btn btn-ghost btn-icon p-2 text-[var(--text-muted)] hover:text-[var(--accent-primary)] flex-shrink-0"
            title="Acknowledge"
          >
            <CheckCircle size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}