import React from 'react';
import { Play, Pause } from 'lucide-react';
import { TIME_SLICES } from '../services/trafficData';

export default function TimelineScrubber({
  currentStepIndex,
  onStepChange,
  isPlaying,
  onTogglePlay,
  speedMultiplier,
  onSpeedChange
}) {
  const currentSlice = TIME_SLICES[currentStepIndex] || TIME_SLICES[0];

  return (
    <footer className="timeline-bar">
      {/* Playback Controls & Speed Selector (1x, 2x, 3x, 4x) */}
      <div className="playback-controls">
        <button 
          className="play-pause-btn"
          onClick={onTogglePlay}
          title={isPlaying ? "Pause Timeline" : "Auto-Play 24-Hour Timeline"}
        >
          {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
        </button>

        <div className="speed-selector" style={{ display: 'flex', gap: '3px' }}>
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              className={`speed-option ${speedMultiplier === s ? 'active' : ''}`}
              onClick={() => onSpeedChange(s)}
              title={`Switch to ${s}x playback speed`}
              style={{
                minWidth: '32px',
                padding: '3px 7px',
                fontSize: '11px',
                fontWeight: speedMultiplier === s ? 800 : 600
              }}
            >
              {s}&times;
            </button>
          ))}
        </div>
      </div>

      {/* Scrub Slider Area */}
      <div className="timeline-scrub-area">
        <input 
          type="range"
          className="range-slider"
          min="0"
          max={TIME_SLICES.length - 1}
          value={currentStepIndex}
          onChange={(e) => onStepChange(parseInt(e.target.value, 10))}
          title="Drag to scrub through 24 hours of recording"
        />

        <div className="timestamp-ticks">
          <span>12:00 AM (Night)</span>
          <span>06:00 AM (Dawn)</span>
          <span style={{ color: '#EF4444', fontWeight: 700 }}>09:30 AM (AM Peak)</span>
          <span>01:30 PM (Midday)</span>
          <span style={{ color: '#DC2626', fontWeight: 700 }}>06:30 PM (PM Peak)</span>
          <span>11:30 PM (Night)</span>
        </div>
      </div>

      {/* Clean Right HUD Time Display */}
      <div className="current-time-hud">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            background: currentSlice.congestionIndexPct > 75 ? '#FEF2F2' : '#EFF6FF',
            color: currentSlice.congestionIndexPct > 75 ? '#DC2626' : '#2563EB',
            padding: '3px 8px',
            borderRadius: '4px',
            border: `1px solid ${currentSlice.congestionIndexPct > 75 ? '#FECACA' : '#BFDBFE'}`
          }}>
            {currentSlice.period}
          </span>
          <span style={{
            fontSize: '16px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#0F172A'
          }}>
            {currentSlice.timeLabel}
          </span>
        </div>
      </div>
    </footer>
  );
}
