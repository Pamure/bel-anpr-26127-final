import React, { useEffect, useRef } from 'react'
import { MapPin, Clock, Eye, ChevronRight, Download, AlertTriangle, CheckCircle } from 'lucide-react'

interface DetectionListProps {
  detections: any[]
  activeTime: number
  onDetectionClick: (detection: any) => void
  onShowPlateCrops: (plate: string, crops: any[]) => void
}

export function DetectionList({ detections, activeTime, onDetectionClick, onShowPlateCrops }: DetectionListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeDetectionRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to active detection
  useEffect(() => {
    if (activeDetectionRef.current && listRef.current) {
      activeDetectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeTime])

  if (!detections.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="mt-4 text-[var(--text-muted)]">No detections in trajectory</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-standard)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider">DETECTION LOG</h3>
          <span className="badge badge-info">{detections.length} SIGHTINGS</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-muted)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
            HIGH CONF ({'>'}80%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-warning)]" />
            MEDIUM (50-80%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-critical)]" />
            LOW ({'<'}50%)
          </span>
        </div>
      </div>

      {/* Detection List */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
        {detections.map((detection, idx) => {
          const detectionTime = new Date(detection.detected_at).getTime()
          const isActive = Math.abs(detectionTime - activeTime) < 1000
          const confidence = detection.confidence * 100
          const confClass = confidence > 80 ? 'text-[var(--accent-primary)]' : confidence > 50 ? 'text-[var(--accent-warning)]' : 'text-[var(--accent-critical)]'

          return (
            <div
              key={detection.id}
              ref={isActive ? activeDetectionRef : null}
              onClick={() => onDetectionClick(detection)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-150 group cursor-pointer ${
                isActive 
                  ? 'bg-[rgba(0,229,153,0.1)] border border-[var(--accent-primary)]/50 shadow-[0_0_12px_rgba(0,229,153,0.2)]'
                  : 'hover:bg-[var(--bg-elevated)] border border-transparent'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Time & Camera */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-sm ${confClass}`}>
                      {confidence.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {new Date(detection.detected_at).toLocaleTimeString()}
                    </span>
                    {isActive && (
                      <span className="badge badge-success text-[10px] animate-pulse">LIVE</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate font-mono">{detection.camera_label || detection.camera_id}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1">
                    <span className="font-mono">{detection.plate_normalized}</span>
                    <span>•</span>
                    <span className="capitalize">{detection.vehicle_type}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onShowPlateCrops(detection.plate_normalized, []) }}
                    className="btn btn-ghost btn-icon p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
                    title="View plate crops"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDetectionClick(detection) }}
                    className="btn btn-ghost btn-icon p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-secondary)]"
                    title="Center on map"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}