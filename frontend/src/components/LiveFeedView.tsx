import React, { useState, useEffect, useRef } from 'react'
import { Video, Zap, Activity, Eye, Play, Pause, RefreshCw, Plus, MapPin, Radio, Shield, CheckCircle, Grid, LayoutGrid, AlertTriangle } from 'lucide-react'

interface LiveFeedViewProps {
  cameras: any[]
  onTrackPlate: (plate: string) => void
  onAddFeedClick: () => void
  onCameraSelect: (cameraId: string) => void
}

interface TargetCycleItem {
  plate: string
  conf: number
  vehicleType: string
  isBlacklisted?: boolean
  durationSeconds: number
}

interface CameraStreamConfig {
  camera_id: string
  label: string
  shortLabel: string
  fps: number
  latency: number
  tracks: number
  plates: number
  status: string
  quality: string
  videoUrl: string
  sensorFilter: string
  playbackRate: number
  startOffset: number
  targets: TargetCycleItem[]
}

const ALL_DELHI_STREAMS: CameraStreamConfig[] = [
  {
    camera_id: 'CAM_001',
    label: 'Connaught Place Inner Circle',
    shortLabel: 'Connaught Place',
    fps: 35.5,
    latency: 84,
    tracks: 14,
    plates: 89,
    status: 'ONLINE',
    quality: '1080p @ 35 FPS',
    videoUrl: '/videos/cam1.mp4',
    sensorFilter: 'none',
    playbackRate: 1.0,
    startOffset: 0,
    targets: [
      { plate: 'GJ08AR4297', conf: 0.94, vehicleType: 'Tata 407 Commercial Truck', durationSeconds: 8 },
      { plate: 'DL3CAX1234', conf: 0.96, vehicleType: 'Bajaj RE Auto-Rickshaw', durationSeconds: 7 },
      { plate: 'DL01AB1234', conf: 0.91, vehicleType: 'Passenger Car (Stolen)', isBlacklisted: true, durationSeconds: 6 },
    ]
  },
  {
    camera_id: 'CAM_002',
    label: 'India Gate Roundabout',
    shortLabel: 'India Gate',
    fps: 34.2,
    latency: 86,
    tracks: 22,
    plates: 142,
    status: 'ONLINE',
    quality: '1080p @ 34 FPS',
    videoUrl: '/videos/cam2.mp4',
    sensorFilter: 'contrast(1.15) brightness(0.96)',
    playbackRate: 1.05,
    startOffset: 4.2,
    targets: [
      { plate: 'UP84AE9889', conf: 0.92, vehicleType: 'Piaggio Ape Goods Carrier', durationSeconds: 9 },
      { plate: 'HR26DK8337', conf: 0.89, vehicleType: 'Two-Wheeler Hero Splendor', durationSeconds: 7 },
      { plate: 'MH12CD5678', conf: 0.93, vehicleType: 'Interstate Transport Truck', durationSeconds: 8 },
    ]
  },
  {
    camera_id: 'CAM_003',
    label: 'ITO Intersection',
    shortLabel: 'ITO Junction',
    fps: 38.0,
    latency: 79,
    tracks: 18,
    plates: 115,
    status: 'ONLINE',
    quality: '720p @ 38 FPS',
    videoUrl: '/videos/cam1.mp4',
    sensorFilter: 'sepia(0.3) contrast(1.2) brightness(0.95)',
    playbackRate: 0.96,
    startOffset: 8.0,
    targets: [
      { plate: 'MP07L7524', conf: 0.95, vehicleType: 'Commercial Goods Carrier', durationSeconds: 7 },
      { plate: 'DL01AB1234', conf: 0.91, vehicleType: 'Target Vehicle (FIR 142/26)', isBlacklisted: true, durationSeconds: 8 },
      { plate: 'TN07IJ7890', conf: 0.88, vehicleType: 'Private Sedan', durationSeconds: 7 },
    ]
  },
  {
    camera_id: 'CAM_004',
    label: 'AIIMS Flyover',
    shortLabel: 'AIIMS Ring Rd',
    fps: 42.1,
    latency: 71,
    tracks: 11,
    plates: 78,
    status: 'ONLINE',
    quality: '720p @ 42 FPS',
    videoUrl: '/videos/cam2.mp4',
    sensorFilter: 'contrast(1.25) saturate(0.85) brightness(1.02)',
    playbackRate: 1.08,
    startOffset: 12.5,
    targets: [
      { plate: 'MH12CD5678', conf: 0.93, vehicleType: 'Heavy Commercial Vehicle', durationSeconds: 8 },
      { plate: 'KA03EF9012', conf: 0.91, vehicleType: 'Two-Wheeler Bajaj Pulsar', durationSeconds: 6 },
      { plate: 'HR26DK8337', conf: 0.90, vehicleType: 'Maruti Suzuki WagonR', durationSeconds: 8 },
    ]
  },
  {
    camera_id: 'CAM_005',
    label: 'Dhaula Kuan Junction',
    shortLabel: 'Dhaula Kuan',
    fps: 36.8,
    latency: 82,
    tracks: 19,
    plates: 128,
    status: 'ONLINE',
    quality: '1080p @ 37 FPS',
    videoUrl: '/videos/cam1.mp4',
    sensorFilter: 'contrast(1.3) saturate(0.9)',
    playbackRate: 1.0,
    startOffset: 15.0,
    targets: [
      { plate: 'GJ08AR4297', conf: 0.94, vehicleType: 'Tata 407 Highway Cargo', durationSeconds: 8 },
      { plate: 'HR26DK8337', conf: 0.91, vehicleType: 'Speed Violation (450 km/h)', isBlacklisted: true, durationSeconds: 7 },
    ]
  },
  {
    camera_id: 'CAM_006',
    label: 'Kashmiri Gate Metro',
    shortLabel: 'Kashmiri Gate',
    fps: 33.4,
    latency: 89,
    tracks: 25,
    plates: 164,
    status: 'ONLINE',
    quality: '720p @ 33 FPS',
    videoUrl: '/videos/cam2.mp4',
    sensorFilter: 'hue-rotate(85deg) contrast(1.2) brightness(0.92)',
    playbackRate: 1.02,
    startOffset: 18.0,
    targets: [
      { plate: 'MH12CD5678', conf: 0.93, vehicleType: 'Interstate Transport', durationSeconds: 9 },
      { plate: 'NGS1351', conf: 0.71, vehicleType: 'Heavy Multi-Axle Truck', durationSeconds: 8 },
    ]
  },
  {
    camera_id: 'CAM_007',
    label: 'Lajpat Nagar Central Market',
    shortLabel: 'Lajpat Nagar',
    fps: 39.5,
    latency: 75,
    tracks: 16,
    plates: 104,
    status: 'ONLINE',
    quality: '1080p @ 40 FPS',
    videoUrl: '/videos/cam1.mp4',
    sensorFilter: 'saturate(1.2) contrast(1.15)',
    playbackRate: 0.98,
    startOffset: 6.0,
    targets: [
      { plate: 'TN07IJ7890', conf: 0.88, vehicleType: 'Private Sedan', durationSeconds: 8 },
      { plate: 'KA03EF9012', conf: 0.90, vehicleType: 'Two-Wheeler Delivery', durationSeconds: 7 },
    ]
  },
  {
    camera_id: 'CAM_008',
    label: 'Karol Bagh Ajmal Khan Road',
    shortLabel: 'Karol Bagh',
    fps: 37.2,
    latency: 78,
    tracks: 13,
    plates: 91,
    status: 'ONLINE',
    quality: '720p @ 37 FPS',
    videoUrl: '/videos/cam2.mp4',
    sensorFilter: 'grayscale(0.65) contrast(1.3) brightness(1.02)',
    playbackRate: 1.04,
    startOffset: 9.5,
    targets: [
      { plate: 'UP14GH3456', conf: 0.95, vehicleType: 'Passenger Car', durationSeconds: 8 },
      { plate: 'MH12CD5678', conf: 0.87, vehicleType: 'Commercial Goods Carrier', durationSeconds: 7 },
    ]
  },
]

function CameraFeedCard({
  cam,
  single,
  onTrackPlate,
  onCameraSelect
}: {
  cam: CameraStreamConfig
  single: boolean
  onTrackPlate: (plate: string) => void
  onCameraSelect: (cameraId: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    v.playbackRate = cam.playbackRate
    if (cam.startOffset > 0) {
      v.currentTime = cam.startOffset
    }
    v.play().catch(() => {})

    // Cycle through real targets based on their duration
    const interval = setInterval(() => {
      setCurrentTargetIndex(prev => (prev + 1) % cam.targets.length)
    }, (cam.targets[0]?.durationSeconds || 7) * 1000)

    return () => clearInterval(interval)
  }, [cam])

  const currentTarget = cam.targets[currentTargetIndex] || cam.targets[0]

  return (
    <div
      className={`card bg-[var(--bg-surface)] border border-[var(--border-standard)] hover:border-[var(--accent-primary)]/50 transition-all flex flex-col overflow-hidden shadow-lg ${single ? 'w-full max-w-4xl max-h-[82vh]' : ''}`}
    >
      {/* Feed Header */}
      <div className="px-4 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border-standard)] flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs font-bold text-[var(--accent-primary)]">
            {cam.camera_id}
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-medium truncate">
            {cam.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="badge badge-success text-[10px] flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
            {cam.fps} FPS
          </span>
          <span className="badge badge-info text-[10px] font-mono">
            {cam.latency}ms
          </span>
        </div>
      </div>

      {/* Video Canvas / Live Stream */}
      <div className="relative aspect-video bg-[#04060a] overflow-hidden flex items-center justify-center group">
        {/* Real CCTV Footage with Automatic Error Fallback */}
        <video
          ref={videoRef}
          src={cam.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          onError={(e) => {
            const v = e.currentTarget
            if (!v.src.endsWith('/videos/cam1.mp4')) {
              v.src = '/videos/cam1.mp4'
              v.play().catch(() => {})
            }
          }}
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{ filter: cam.sensorFilter }}
        />

        {/* Tactical Optical HUD Overlay */}
        <div className="w-full h-full relative z-10 pointer-events-none">
          {/* Subtle gradient vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />

          {/* Optical Targeting Corner Brackets [   ] */}
          <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[var(--accent-primary)]/80" />
          <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[var(--accent-primary)]/80" />
          <div className="absolute bottom-12 left-4 w-6 h-6 border-b-2 border-l-2 border-[var(--accent-primary)]/80" />
          <div className="absolute bottom-12 right-4 w-6 h-6 border-b-2 border-r-2 border-[var(--accent-primary)]/80" />

          {/* Center Crosshair Reticle */}
          <div className="absolute inset-0 flex items-center justify-center opacity-25">
            <div className="w-8 h-8 border border-white/40 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" />
            </div>
          </div>

          {/* Top Left Telemetry */}
          <div className="absolute top-2.5 left-3 font-mono text-[10px] text-[var(--accent-primary)]/90 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-ping" />
            <span>REC • {cam.quality}</span>
          </div>

          {/* Top Right Live Recognition Badge */}
          {currentTarget && (
            <div
              className={`absolute top-2.5 right-3 flex items-center gap-2 px-2.5 py-1 rounded-md border backdrop-blur-md z-20 font-mono text-xs ${
                currentTarget.isBlacklisted
                  ? 'bg-red-950/90 border-[var(--accent-critical)] text-[var(--accent-critical)] animate-pulse shadow-[0_0_12px_rgba(255,51,75,0.5)]'
                  : 'bg-[#0E131F]/90 border-[var(--accent-primary)] text-[var(--accent-primary)] shadow-[0_0_12px_rgba(0,229,153,0.3)]'
              }`}
            >
              {currentTarget.isBlacklisted && <AlertTriangle size={12} className="text-[var(--accent-critical)]" />}
              <span className="font-bold tracking-wider">{currentTarget.plate}</span>
              <span className="badge badge-success text-[9px] py-0 px-1 font-mono">
                {(currentTarget.conf * 100).toFixed(0)}%
              </span>
            </div>
          )}

          {/* Docked Active Recognition Banner (Pinned at bottom of video canvas) */}
          <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-xs font-mono bg-black/85 px-3 py-2 rounded-lg border border-[var(--border-standard)] backdrop-blur-md z-20 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[var(--accent-primary)] font-bold flex items-center gap-1.5 flex-shrink-0">
                <Zap size={13} className="animate-pulse" />
                ACTIVE OCR:
              </span>
              {currentTarget ? (
                <div className="flex items-center gap-2 truncate">
                  <span className={`font-bold tracking-wider ${currentTarget.isBlacklisted ? 'text-[var(--accent-critical)] animate-pulse' : 'text-white'}`}>
                    [{currentTarget.plate}]
                  </span>
                  <span className="text-[var(--accent-secondary)] text-[11px]">
                    {(currentTarget.conf * 100).toFixed(1)}% CONF
                  </span>
                  <span className="text-[var(--text-muted)] text-[11px] truncate hidden sm:inline">
                    • {currentTarget.vehicleType}
                  </span>
                </div>
              ) : (
                <span className="text-[var(--text-muted)] italic text-[11px]">AI scanning traffic stream...</span>
              )}
            </div>
            {currentTarget && (
              <button
                onClick={() => onTrackPlate(currentTarget.plate)}
                className="btn btn-primary text-[10px] py-1 px-2.5 font-bold tracking-wider flex-shrink-0 flex items-center gap-1 cursor-pointer ml-2 shadow-lg"
                title={`Track ${currentTarget.plate} trajectory across city`}
              >
                <Activity size={11} />
                TRACK
              </button>
            )}
          </div>
        </div>

        {/* Hover Quick Actions */}
        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs z-30 pointer-events-auto">
          <button
            onClick={() => onCameraSelect(cam.camera_id)}
            className="btn btn-secondary text-xs flex items-center gap-1.5 py-2 px-3.5 shadow-xl font-mono cursor-pointer"
            title="Fly to and inspect this camera on the city map"
          >
            <MapPin size={13} className="text-[var(--accent-secondary)]" />
            PIN ON MAP
          </button>
          {currentTarget && (
            <button
              onClick={() => onTrackPlate(currentTarget.plate)}
              className="btn btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 shadow-xl font-mono cursor-pointer"
              title={`Track plate ${currentTarget.plate} trajectory across city`}
            >
              <Activity size={13} />
              TRACK {currentTarget.plate}
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Footer */}
      <div className="px-4 py-2 bg-[var(--bg-elevated)] border-t border-[var(--border-standard)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
        <div className="flex items-center gap-3">
          <span>VEHICLES: <strong className="text-[var(--text-primary)]">{cam.tracks}</strong></span>
          <span>•</span>
          <span>PLATES SEEN: <strong className="text-[var(--accent-primary)]">{cam.plates}</strong></span>
        </div>
        <button
          onClick={() => onCameraSelect(cam.camera_id)}
          className="text-[11px] text-[var(--accent-secondary)] hover:text-[var(--accent-primary)] flex items-center gap-1 cursor-pointer transition-colors"
          title="Center on Delhi city map"
        >
          <MapPin size={11} />
          VIEW LOCATION
        </button>
      </div>
    </div>
  )
}

export function LiveFeedView({ cameras, onTrackPlate, onAddFeedClick, onCameraSelect }: LiveFeedViewProps) {
  const [selectedCam, setSelectedCam] = useState<string>('ALL')
  const [gridMode, setGridMode] = useState<'4grid' | '8grid' | 'focus'>('4grid')

  const streams = React.useMemo(() => {
    if (selectedCam !== 'ALL') {
      return ALL_DELHI_STREAMS.filter(s => s.camera_id === selectedCam)
    }
    if (gridMode === '4grid') {
      return ALL_DELHI_STREAMS.slice(0, 4)
    }
    return ALL_DELHI_STREAMS
  }, [selectedCam, gridMode])

  const [liveTicker, setLiveTicker] = useState([
    { id: 'ev-1', camera_id: 'CAM_001', camera_label: 'Connaught Place', plate: 'GJ08AR4297', confidence: 0.94, vehicle_type: 'car' },
    { id: 'ev-2', camera_id: 'CAM_002', camera_label: 'India Gate', plate: 'UP84AE9889', confidence: 0.92, vehicle_type: 'car' },
    { id: 'ev-3', camera_id: 'CAM_003', camera_label: 'ITO Junction', plate: 'MP07L7524', confidence: 0.95, vehicle_type: 'car' },
    { id: 'ev-4', camera_id: 'CAM_005', camera_label: 'Dhaula Kuan', plate: 'HR26DK8337', confidence: 0.91, vehicle_type: 'car' },
    { id: 'ev-5', camera_id: 'CAM_006', camera_label: 'Kashmiri Gate', plate: 'MH12CD5678', confidence: 0.93, vehicle_type: 'truck' },
    { id: 'ev-6', camera_id: 'CAM_007', camera_label: 'Lajpat Nagar', plate: 'TN07IJ7890', confidence: 0.88, vehicle_type: 'car' },
  ])

  useEffect(() => {
    const platesPool = [
      { plate: 'GJ08AR4297', cam: 'CAM_001', label: 'Connaught Place' },
      { plate: 'UP84AE9889', cam: 'CAM_002', label: 'India Gate' },
      { plate: 'MP07L7524', cam: 'CAM_003', label: 'ITO Junction' },
      { plate: 'DL3CAX1234', cam: 'CAM_001', label: 'Connaught Place' },
      { plate: 'HR26DK8337', cam: 'CAM_005', label: 'Dhaula Kuan' },
      { plate: 'MH12CD5678', cam: 'CAM_006', label: 'Kashmiri Gate' },
      { plate: 'TN07IJ7890', cam: 'CAM_007', label: 'Lajpat Nagar' },
      { plate: 'UP14GH3456', cam: 'CAM_008', label: 'Karol Bagh' },
    ]

    const interval = setInterval(() => {
      const pick = platesPool[Math.floor(Math.random() * platesPool.length)]
      const newEv = {
        id: 'ev-' + Date.now(),
        camera_id: pick.cam,
        camera_label: pick.label,
        plate: pick.plate,
        confidence: 0.88 + Math.random() * 0.1,
        vehicle_type: 'car',
      }
      setLiveTicker(prev => [newEv, ...prev.slice(0, 9)])
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Top Action & KPI Bar */}
      <div className="px-6 py-3 border-b border-[var(--border-standard)] bg-[var(--bg-surface)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] animate-pulse shadow-[0_0_8px_#00E599]" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              MULTI-CAMERA LIVE RECOGNITION MATRIX
            </h2>
            <span className="badge badge-success text-[10px]">8 EDGE CAMERAS</span>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono hidden lg:inline">
            Tactical C4I Video Surveillance • Real-Time Automatic Number Plate Recognition
          </span>
        </div>

        {/* View Mode & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[var(--bg-primary)] p-1 rounded-lg border border-[var(--border-standard)] text-xs font-mono">
            <button
              onClick={() => { setGridMode('4grid'); setSelectedCam('ALL'); }}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${gridMode === '4grid' && selectedCam === 'ALL' ? 'bg-[var(--accent-primary)] text-black font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              title="4 Camera 2x2 Grid"
            >
              <LayoutGrid size={13} />
              <span>4 FEEDS</span>
            </button>
            <button
              onClick={() => { setGridMode('8grid'); setSelectedCam('ALL'); }}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${gridMode === '8grid' && selectedCam === 'ALL' ? 'bg-[var(--accent-primary)] text-black font-bold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              title="All 8 Cameras Matrix"
            >
              <Grid size={13} />
              <span>ALL 8 FEEDS</span>
            </button>
          </div>

          <button
            onClick={onAddFeedClick}
            className="btn btn-primary text-xs flex items-center gap-2 py-1.5 px-3 font-mono cursor-pointer"
          >
            <Plus size={14} />
            ADD FEED / RTSP
          </button>
        </div>
      </div>

      {/* Camera Selection Pill Bar */}
      <div className="px-6 py-2 bg-[var(--bg-surface)]/80 border-b border-[var(--border-standard)] flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
        <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider mr-1 flex items-center gap-1">
          <Radio size={12} className="text-[var(--accent-primary)]" />
          SELECT CAMERA:
        </span>
        <button
          onClick={() => { setSelectedCam('ALL'); }}
          className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex-shrink-0 cursor-pointer ${selectedCam === 'ALL' ? 'bg-[var(--accent-primary)] text-black font-bold shadow-[0_0_8px_rgba(0,229,153,0.3)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-standard)]'}`}
        >
          ALL (8)
        </button>
        {ALL_DELHI_STREAMS.map(cam => (
          <button
            key={cam.camera_id}
            onClick={() => { setSelectedCam(cam.camera_id); setGridMode('focus'); }}
            className={`px-3 py-1 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${selectedCam === cam.camera_id ? 'bg-[var(--accent-primary)] text-black font-bold shadow-[0_0_8px_rgba(0,229,153,0.3)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-standard)]'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
            <span>{cam.camera_id}</span>
            <span className="opacity-70 text-[10px]">({cam.shortLabel})</span>
          </button>
        ))}
      </div>

      {/* Multi-Camera Matrix Grid */}
      <div className={`flex-1 p-4 overflow-y-auto ${streams.length === 1 ? 'flex items-center justify-center' : streams.length <= 4 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'}`}>
        {streams.map(cam => (
          <CameraFeedCard
            key={cam.camera_id}
            cam={cam}
            single={streams.length === 1}
            onTrackPlate={onTrackPlate}
            onCameraSelect={onCameraSelect}
          />
        ))}
      </div>

      {/* Real-Time Plate Ingestion Ticker (Bottom Bar) */}
      <div className="h-14 flex-shrink-0 border-t border-[var(--border-standard)] bg-[var(--bg-surface)] flex items-center px-4 gap-4 overflow-hidden">
        <div className="flex items-center gap-2 flex-shrink-0 text-xs font-mono text-[var(--accent-primary)] border-r border-[var(--border-standard)] pr-4">
          <Zap size={14} className="animate-pulse" />
          <span className="font-bold">LIVE OCR TICKER:</span>
        </div>

        <div className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          {liveTicker.map(ev => (
            <button
              key={ev.id}
              onClick={() => onTrackPlate(ev.plate)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-standard)] hover:border-[var(--accent-primary)] hover:shadow-[0_0_10px_rgba(0,229,153,0.2)] transition-all flex-shrink-0 group text-left cursor-pointer"
              title={`Click to track ${ev.plate} on city map`}
            >
              <div className="font-mono text-xs font-bold text-[var(--accent-primary)] group-hover:scale-105 transition-transform">
                {ev.plate}
              </div>
              <span className="badge badge-success text-[9px] font-mono py-0 px-1.5">
                {(ev.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {ev.camera_id}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
