import React, { useState } from 'react'
import { X, Video, Radio, Upload, MapPin, Sliders, Play, CheckCircle, Zap, Shield } from 'lucide-react'

interface AddFeedModalProps {
  onClose: () => void
  onAddFeed: (feedData: {
    camera_id: string
    label: string
    source: string
    latitude: number
    longitude: number
    frame_skip: number
    confidence: number
    ocr_engine: string
  }) => void
}

const PRESET_FEEDS = [
  {
    id: 'preset_1',
    name: 'Delhi High-Density Traffic (1080p CCTV)',
    source: '/home/mjonir/f/sih2026/work1/sourceVIdeoHD.mp4',
    label: 'Connaught Place Outer Circle',
    lat: 28.6315,
    lng: 77.2167,
    fps: '35.5 FPS',
    density: 'High (35+ veh/frame)',
  },
  {
    id: 'preset_2',
    name: 'Delhi Arterial Gridlock & Corridors (1080p)',
    source: '/home/mjonir/f/sih2026/work1/Covid-time Delhi traffic goes into gridlock mode once again, on a daily basis!_1080p.mp4',
    label: 'India Gate C-Hexagon',
    lat: 28.6129,
    lng: 77.2295,
    fps: '34.2 FPS',
    density: 'Severe Congestion',
  },
  {
    id: 'preset_3',
    name: 'Day & Night Dual-Spectrum Transition CCTV (720p)',
    source: '/home/mjonir/f/sih2026/work1/cctv_footage/CCTV CAMERA  traffic day night clip_720p.mp4',
    label: 'ITO Junction Northbound',
    lat: 28.6282,
    lng: 77.2410,
    fps: '38.0 FPS',
    density: 'Variable Illumination',
  },
  {
    id: 'preset_4',
    name: 'Urban Arterial Surveillance Feed (720p)',
    source: '/home/mjonir/f/sih2026/work1/cctv_footage/yt_traffic.mp4',
    label: 'AIIMS Ring Road Flyover',
    lat: 28.5672,
    lng: 77.2100,
    fps: '42.1 FPS',
    density: 'Medium Urban',
  },
]

export function AddFeedModal({ onClose, onAddFeed }: AddFeedModalProps) {
  const [feedMode, setFeedMode] = useState<'preset' | 'rtsp' | 'file'>('preset')
  const [selectedPreset, setSelectedPreset] = useState(PRESET_FEEDS[0])
  
  const [cameraId, setCameraId] = useState('CAM_009')
  const [label, setLabel] = useState('Ashram Chowk Flyover')
  const [rtspUrl, setRtspUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [latitude, setLatitude] = useState(28.5720)
  const [longitude, setLongitude] = useState(77.2550)
  const [frameSkip, setFrameSkip] = useState(3)
  const [confidence, setConfidence] = useState(0.35)
  const [ocrEngine, setOcrEngine] = useState('teammate')
  const [isLaunching, setIsLaunching] = useState(false)

  const handleSelectPreset = (preset: typeof PRESET_FEEDS[0]) => {
    setSelectedPreset(preset)
    setLabel(preset.label)
    setLatitude(preset.lat)
    setLongitude(preset.lng)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLaunching(true)

    const source = feedMode === 'preset'
      ? selectedPreset.source
      : feedMode === 'rtsp'
      ? rtspUrl
      : fileName || '/app/test_video.mp4'

    onAddFeed({
      camera_id: cameraId,
      label,
      source,
      latitude,
      longitude,
      frame_skip: frameSkip,
      confidence,
      ocr_engine: ocrEngine,
    })

    setTimeout(() => {
      setIsLaunching(false)
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        id="add-feed-modal"
        className="relative w-full max-w-2xl bg-[var(--bg-surface)] border border-[var(--border-standard)] rounded-xl shadow-2xl overflow-hidden animate-slide-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-standard)] bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[rgba(0,229,153,0.15)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
              <Video size={20} />
            </div>
            <div>
              <h2 className="font-mono text-base font-bold text-[var(--text-primary)]">
                INGEST LIVE CCTV FEED / RTSP STREAM
              </h2>
              <p className="text-xs text-[var(--text-muted)] font-mono">
                Real-Time Edge Computer Vision Pipeline • YOLO26s + TensorRT + India Rules
              </p>
            </div>
          </div>
          <button
            id="add-feed-close"
            onClick={onClose}
            className="btn btn-ghost btn-icon p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Feed Source Selector Tabs */}
          <div>
            <label className="block text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">
              SOURCE TYPE
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-standard)]">
              <button
                type="button"
                onClick={() => setFeedMode('preset')}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                  feedMode === 'preset'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-[var(--shadow-glow)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Video size={14} />
                DELHI PRESETS
              </button>
              <button
                type="button"
                onClick={() => setFeedMode('rtsp')}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                  feedMode === 'rtsp'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-[var(--shadow-glow)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Radio size={14} />
                RTSP / HTTP STREAM
              </button>
              <button
                type="button"
                onClick={() => setFeedMode('file')}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                  feedMode === 'file'
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)] font-bold shadow-[var(--shadow-glow)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Upload size={14} />
                CUSTOM FILE (MP4)
              </button>
            </div>
          </div>

          {/* Preset Feed Selection */}
          {feedMode === 'preset' && (
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                SELECT TEST CCTV CLIP (HIGH-REALISM BENCHMARKS)
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {PRESET_FEEDS.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      selectedPreset.id === p.id
                        ? 'border-[var(--accent-primary)] bg-[rgba(0,229,153,0.08)] shadow-[0_0_12px_rgba(0,229,153,0.15)]'
                        : 'border-[var(--border-standard)] bg-[var(--bg-primary)] hover:border-[var(--border-focus)]'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-[var(--text-primary)]">{p.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-2 mt-1">
                        <MapPin size={10} className="text-[var(--accent-secondary)]" />
                        <span>{p.label}</span>
                        <span>•</span>
                        <span className="text-[var(--accent-warning)]">{p.density}</span>
                      </div>
                    </div>
                    <span className="badge badge-success text-[10px]">{p.fps}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RTSP Stream URL Input */}
          {feedMode === 'rtsp' && (
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                RTSP STREAM URL / IP CAMERA ENDPOINT
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={rtspUrl}
                  onChange={e => setRtspUrl(e.target.value)}
                  placeholder="rtsp://admin:password@192.168.1.100:554/live/ch0"
                  className="input font-mono text-xs pl-9"
                  required
                />
                <Radio className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Compatible with RTSP, HLS, RTMP, and HTTP MJPEG IP camera streams.
              </p>
            </div>
          )}

          {/* Custom File Upload */}
          {feedMode === 'file' && (
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">
                UPLOAD VIDEO FILE (JUDGE FOOTAGE)
              </label>
              <div className="border-2 border-dashed border-[var(--border-standard)] hover:border-[var(--accent-primary)] rounded-lg p-6 text-center transition-colors bg-[var(--bg-primary)]">
                <Upload className="w-8 h-8 mx-auto text-[var(--accent-primary)] mb-2 opacity-80" />
                <p className="text-xs text-[var(--text-secondary)] font-medium mb-1">
                  Drag and drop MP4, AVI, or MKV video file here
                </p>
                <p className="text-[10px] text-[var(--text-muted)] font-mono mb-3">
                  Up to 4K resolution supported • Accelerated on RTX GPU
                </p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setFileName(f.name)
                  }}
                  className="text-xs text-[var(--text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[var(--accent-primary)] file:text-[var(--bg-primary)] file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Camera Metadata & GPS Coordinates */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--border-standard)]">
            <div>
              <label className="block text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                CAMERA ID
              </label>
              <input
                type="text"
                value={cameraId}
                onChange={e => setCameraId(e.target.value.toUpperCase())}
                className="input font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                INTERSECTION LABEL
              </label>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="input text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                LATITUDE
              </label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={e => setLatitude(parseFloat(e.target.value))}
                className="input font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-1">
                LONGITUDE
              </label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={e => setLongitude(parseFloat(e.target.value))}
                className="input font-mono text-xs"
                required
              />
            </div>
          </div>

          {/* AI Pipeline Options */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-standard)]">
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1">
                FRAME SKIP
              </label>
              <select
                value={frameSkip}
                onChange={e => setFrameSkip(parseInt(e.target.value))}
                className="input text-xs py-1"
              >
                <option value={1}>1 (Full 60 FPS)</option>
                <option value={2}>2 (30 FPS Target)</option>
                <option value={3}>3 (35+ FPS Optimized)</option>
                <option value={5}>5 (Edge Economy)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1">
                CONFIDENCE
              </label>
              <select
                value={confidence}
                onChange={e => setConfidence(parseFloat(e.target.value))}
                className="input text-xs py-1"
              >
                <option value={0.25}>0.25 (High Recall)</option>
                <option value={0.35}>0.35 (Balanced)</option>
                <option value={0.50}>0.50 (High Precision)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[var(--text-muted)] uppercase mb-1">
                OCR ENGINE
              </label>
              <select
                value={ocrEngine}
                onChange={e => setOcrEngine(e.target.value)}
                className="input text-xs py-1 font-mono"
              >
                <option value="teammate">PP-OCRv5 + Rules</option>
                <option value="paddleocr">ICPR 2026 Voter</option>
                <option value="friend">Friend Hot-Swap</option>
              </select>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isLaunching}
              className="btn btn-primary text-xs flex items-center gap-2"
            >
              <Zap size={14} className={isLaunching ? 'animate-spin' : ''} />
              {isLaunching ? 'INITIALIZING AI ENGINE...' : 'START LIVE ANPR PIPELINE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
