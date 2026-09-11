import React, { useRef, useEffect, useState } from 'react'
import { Play, Pause, FastForward, Rewind, SkipBack, SkipForward } from 'lucide-react'

interface TimelinePanelProps {
  trajectoryData: any
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  timeRange: [number, number]
  onPlaybackChange: (updates: any) => void
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString()
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return pad(h) + ':' + pad(m) + ':' + pad(s)
}

export function TimelinePanel(props: TimelinePanelProps) {
  const { trajectoryData, currentTime, isPlaying, playbackSpeed, timeRange, onPlaybackChange } = props
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [scrubbing, setScrubbing] = useState(false)

  if (!trajectoryData || !trajectoryData.points || trajectoryData.points.length === 0) {
    return null
  }

  const { points } = trajectoryData
  const osrmMatch = trajectoryData.osrm_match || null
  const minTime = timeRange[0]
  const maxTime = timeRange[1]
  const span = maxTime - minTime
  const progress = span > 0 ? (currentTime - minTime) / span : 0
  const clampedProgress = Math.max(0, Math.min(1, progress))

  const togglePlay = () => onPlaybackChange({ isPlaying: !isPlaying })
  const setSpeed = (speed: number) => onPlaybackChange({ playbackSpeed: speed })
  const stepBack = () => onPlaybackChange({ currentTime: Math.max(minTime, currentTime - 5000) })
  const stepForward = () => onPlaybackChange({ currentTime: Math.min(maxTime, currentTime + 5000) })
  const jumpStart = () => onPlaybackChange({ currentTime: minTime })
  const jumpEnd = () => onPlaybackChange({ currentTime: maxTime })

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frac = parseFloat(e.target.value)
    onPlaybackChange({ currentTime: minTime + frac * span })
  }

  const markers = points.map((p: any, idx: number) => {
    const t = new Date(p.detected_at).getTime()
    const pct = span > 0 ? ((t - minTime) / span) * 100 : (idx / Math.max(1, points.length - 1)) * 100
    return {
      time: t,
      pct: Math.max(0, Math.min(100, pct)),
      camera: p.camera_label || p.camera_id,
      confidence: p.confidence,
      plate: p.plate_normalized,
    }
  })

  return (
    <div
      className="h-24 flex-shrink-0 border-t border-[var(--border-standard)]"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Track row */}
      <div className="flex items-center px-6 pt-3" style={{ height: '44px' }}>
        <div className="w-28 text-[10px] font-mono text-[var(--text-muted)]">{formatClock(minTime)}</div>
        <div className="relative flex-1 mx-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.0001}
            value={clampedProgress}
            onChange={handleSlider}
            onMouseDown={() => setScrubbing(true)}
            onMouseUp={() => setScrubbing(false)}
            className="w-full h-1.5 appearance-none rounded-full cursor-pointer"
            style={{ background: 'linear-gradient(90deg,#00E599 ' + (clampedProgress * 100) + '%,#222B3D ' + (clampedProgress * 100) + '%)', accentColor: '#00E599' }}
            aria-label="Timeline scrubber"
          />
          {markers.map((m, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoverTime(m.time)}
              onMouseLeave={() => setHoverTime(null)}
              title={m.camera + ' • ' + m.plate + ' • ' + (m.confidence * 100).toFixed(0) + '%'}
              className="absolute top-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                left: m.pct + '%',
                transform: 'translate(-50%,-50%)',
                background: m.confidence > 0.8 ? '#00E599' : m.confidence > 0.5 ? '#FFB020' : '#FF334B',
                boxShadow: '0 0 6px currentColor',
              }}
            />
          ))}
        </div>
        <div className="w-28 text-right text-[10px] font-mono text-[var(--text-muted)]">{formatClock(maxTime)}</div>
      </div>

      {hoverTime !== null && (
        <div className="text-center">
          <span className="px-2 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-standard)] rounded text-[10px] font-mono text-[var(--accent-primary)]">
            {formatClock(hoverTime)}
          </span>
        </div>
      )}

      {/* Controls row */}
      <div className="flex items-center justify-between px-6 pb-2" style={{ height: '44px' }}>
        <div className="flex items-center gap-3">
          <span id="timeline-clock" className="font-mono text-sm text-[var(--accent-primary)]" style={{ fontVariant: 'tabular-nums' }}>
            {formatClock(currentTime)}
          </span>
          <span className="text-[11px] text-[var(--text-muted)]">
            DUR {formatDuration(span)}
            {osrmMatch ? ' • DIST ' + (osrmMatch.distance_m / 1000).toFixed(1) + ' km' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={jumpStart} className="btn btn-ghost btn-icon p-1.5" title="Jump to start">
            <SkipBack size={16} />
          </button>
          <button onClick={stepBack} className="btn btn-ghost btn-icon p-1.5" title="Step back 5s">
            <Rewind size={16} />
          </button>
          <button
            onClick={togglePlay}
            className={'btn btn-primary btn-icon p-2' + (isPlaying ? ' animate-pulse' : '')}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={stepForward} className="btn btn-ghost btn-icon p-1.5" title="Step forward 5s">
            <FastForward size={16} />
          </button>
          <button onClick={jumpEnd} className="btn btn-ghost btn-icon p-1.5" title="Jump to end">
            <SkipForward size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-muted)]">SPEED</span>
          <div className="flex items-center gap-1 bg-[var(--bg-primary)] rounded p-0.5">
            {[1, 2, 4, 8].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={
                  'px-2 py-1 text-xs font-mono rounded ' +
                  (playbackSpeed === s
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]')
                }
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}