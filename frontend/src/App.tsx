import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { MapView } from './components/MapView'
import { TimelinePanel } from './components/TimelinePanel'
import { DetectionList } from './components/DetectionList'
import { AnalyticsView } from './components/AnalyticsView'
import { AlertMonitor } from './components/AlertMonitor'
import { PlateModal } from './components/PlateModal'
import { AddFeedModal } from './components/AddFeedModal'
import { LiveFeedView } from './components/LiveFeedView'
import { RadarSweepIcon } from './icons/TacticalIcons'

// Mode types
type ViewMode = 'trajectory' | 'live' | 'analytics' | 'alerts'

interface AppState {
  mode: ViewMode
  selectedPlate: string
  trajectoryData: any
  detections: any[]
  alerts: any[]
  cameras: any[]
  activeCamera: string
  isPlaying: boolean
  playbackSpeed: number
  currentTime: number
  timeRange: [number, number]
}

const initialState: AppState = {
  mode: 'trajectory',
  selectedPlate: 'DL01AB1234',
  trajectoryData: null,
  detections: [],
  alerts: [],
  cameras: [],
  activeCamera: '',
  isPlaying: false,
  playbackSpeed: 1,
  currentTime: 0,
  timeRange: [0, 0],
}

export function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modalPlate, setModalPlate] = useState<null | { plate: string; crops: any[] }>(null)
  const [addFeedModalOpen, setAddFeedModalOpen] = useState(false)
  const mapRef = useRef<any>(null)

  // Fetch cameras on mount
  useEffect(() => {
    fetchCameras()
    fetchAlerts()
  }, [])

  const fetchCameras = async () => {
    try {
      const res = await fetch('/api/stream/cameras', {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || 'bel-anpr-2026-secret-key-change-in-production'}` }
      })
      if (res.ok) {
        const data = await res.json()
        setState(prev => ({ ...prev, cameras: data.cameras || [] }))
      }
    } catch (e) {
      console.error('Failed to fetch cameras:', e)
    }
  }

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/alerts?limit=50', {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || 'bel-anpr-2026-secret-key-change-in-production'}` }
      })
      if (res.ok) {
        const data = await res.json()
        setState(prev => ({ ...prev, alerts: data }))
      }
    } catch (e) {
      console.error('Failed to fetch alerts:', e)
    }
  }

  const handleTrackPlate = useCallback(async (plate: string) => {
    if (!plate.trim()) return
    
    const normalized = plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setState(prev => ({ ...prev, selectedPlate: normalized }))
    
    try {
      const res = await fetch(`/api/trajectory/${normalized}?fuzzy=true&include_osrm=true`, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_API_KEY || 'bel-anpr-2026-secret-key-change-in-production'}` }
      })
      if (res.ok) {
        const data = await res.json()
        setState(prev => ({ 
          ...prev, 
          trajectoryData: data,
          mode: 'trajectory',
        }))
        
        // Compute time range from detections
        if (data.points && data.points.length > 0) {
          const times = data.points.map((p: any) => new Date(p.detected_at).getTime())
          setState(prev => ({
            ...prev,
            timeRange: [Math.min(...times), Math.max(...times)],
            currentTime: Math.min(...times),
          }))
        }
      }
    } catch (e) {
      console.error('Failed to fetch trajectory:', e)
    }
  }, [])

  const handleDetectionClick = useCallback((detection: any) => {
    setState(prev => ({
      ...prev,
      activeCamera: detection.camera_id,
      currentTime: new Date(detection.detected_at).getTime(),
    }))
    // Map will center on this detection via MapView
  }, [])

  const handleCameraLocate = useCallback((cameraId: string) => {
    setState(prev => ({
      ...prev,
      activeCamera: cameraId,
      mode: 'trajectory',
    }))
    const cam = state.cameras.find((c: any) => c.camera_id === cameraId)
    if (cam && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.centerOnDetection?.({
          latitude: cam.latitude,
          longitude: cam.longitude,
        })
      }, 100)
    }
  }, [state.cameras])

  const handleShowPlateCrops = useCallback((plate: string, crops: any[]) => {
    setModalPlate({ plate, crops })
  }, [])

  const handlePlaybackUpdate = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleModeChange = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, mode }))
  }, [])
  const handleAddFeed = useCallback((feedData: any) => {
    setState(prev => {
      const newCam = {
        camera_id: feedData.camera_id,
        label: feedData.label,
        latitude: feedData.latitude,
        longitude: feedData.longitude,
      }
      const camMap = new Map<string, any>()
      prev.cameras.forEach((c: any) => camMap.set(c.camera_id, c))
      camMap.set(newCam.camera_id, newCam)
      return {
        ...prev,
        cameras: Array.from(camMap.values()),
        activeCamera: feedData.camera_id,
        mode: 'live',
      }
    })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return
      }

      switch (e.key) {
        case ' ':
          if (state.mode === 'trajectory') {
            e.preventDefault()
            setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
          }
          break
        case 'ArrowLeft':
          if (state.mode === 'trajectory') {
            e.preventDefault()
            setState(prev => ({ ...prev, currentTime: prev.currentTime - 5000 }))
          }
          break
        case 'ArrowRight':
          if (state.mode === 'trajectory') {
            e.preventDefault()
            setState(prev => ({ ...prev, currentTime: prev.currentTime + 5000 }))
          }
          break
        case '1':
          setState(prev => ({ ...prev, mode: 'trajectory' }))
          break
        case '2':
          setState(prev => ({ ...prev, mode: 'live' }))
          break
        case '3':
          setState(prev => ({ ...prev, mode: 'analytics' }))
          break
        case '4':
          setState(prev => ({ ...prev, mode: 'alerts' }))
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [state.mode])

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        mode={state.mode}
        onModeChange={handleModeChange}
        selectedPlate={state.selectedPlate}
        onTrackPlate={handleTrackPlate}
        cameras={state.cameras}
        activeCamera={state.activeCamera}
        onCameraSelect={handleCameraLocate}
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
        onAddFeedClick={() => setAddFeedModalOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside 
          className={`flex-shrink-0 transition-all duration-300 overflow-y-auto ${sidebarOpen ? 'w-80' : 'w-16'}`}
          style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border-standard)' }}
        >
          <Sidebar
            isOpen={sidebarOpen}
            mode={state.mode}
            selectedPlate={state.selectedPlate}
            onTrackPlate={handleTrackPlate}
            trajectoryData={state.trajectoryData}
            detections={state.detections}
            cameras={state.cameras}
            activeCamera={state.activeCamera}
            onCameraSelect={handleCameraLocate}
            alerts={state.alerts}
            onShowPlateCrops={handleShowPlateCrops}
          />
        </aside>

        {/* Center - Map View */}
        <main className="flex-1 relative min-w-0 overflow-hidden">
          {/* Map View kept mounted to preserve Leaflet WebGL/canvas context */}
          <div className={`h-full w-full relative ${state.mode === 'trajectory' ? 'block' : 'hidden'}`}>
            <MapView
              ref={mapRef}
              mode={state.mode}
              trajectoryData={state.trajectoryData}
              activeCamera={state.activeCamera}
              cameras={state.cameras}
              currentTime={state.currentTime}
              isPlaying={state.isPlaying}
              playbackSpeed={state.playbackSpeed}
              timeRange={state.timeRange}
              detections={state.detections}
              onTimeChange={(time: number | ((prev: number) => number)) => {
                setState(prev => ({
                  ...prev,
                  currentTime: typeof time === 'function' ? time(prev.currentTime) : time
                }))
              }}
              onPlaybackChange={handlePlaybackUpdate}
              onDetectionClick={handleDetectionClick}
              onShowPlateCrops={handleShowPlateCrops}
            />
            <div className="absolute bottom-4 right-4 z-10">
              <RadarSweepIcon size={48} className="radar-sweep opacity-30 pointer-events-none" />
            </div>
          </div>

          {state.mode === 'live' && (
            <div className="h-full w-full">
              <LiveFeedView
                cameras={state.cameras}
                onTrackPlate={handleTrackPlate}
                onAddFeedClick={() => setAddFeedModalOpen(true)}
                onCameraSelect={handleCameraLocate}
              />
            </div>
          )}

          {state.mode === 'analytics' && (
            <div className="h-full w-full">
              <AnalyticsView />
            </div>
          )}

          {state.mode === 'alerts' && (
            <div className="h-full w-full">
              <AlertMonitor alerts={state.alerts} />
            </div>
          )}
        </main>

        {/* Right Telemetry / Information Panel */}
        {(state.mode === 'trajectory' || state.mode === 'live') && (
          <aside className="w-96 flex-shrink-0 overflow-y-auto border-l border-[var(--border-standard)]" style={{ background: 'var(--bg-surface)' }}>
            {state.mode === 'trajectory' && (
              <DetectionList
                detections={state.trajectoryData?.points || []}
                activeTime={state.currentTime}
                onDetectionClick={handleDetectionClick}
                onShowPlateCrops={handleShowPlateCrops}
              />
            )}
            
            {state.mode === 'live' && (
              <div className="p-4">
                <h3 className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mb-4">LIVE TELEMETRY</h3>
                <div className="space-y-3">
                  {(state.cameras.length > 0 ? state.cameras : [
                    { camera_id: 'CAM_001', label: 'Connaught Place Inner Circle' },
                    { camera_id: 'CAM_002', label: 'India Gate Roundabout' },
                    { camera_id: 'CAM_003', label: 'ITO Intersection' },
                    { camera_id: 'CAM_004', label: 'AIIMS Flyover' },
                  ]).map((cam: any) => (
                    <div key={cam.camera_id} className="panel p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm">{cam.camera_id}</span>
                        <span className="badge badge-success">ACTIVE</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{cam.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Timeline Panel */}
      {state.mode === 'trajectory' && state.trajectoryData && (
        <TimelinePanel
          trajectoryData={state.trajectoryData}
          currentTime={state.currentTime}
          isPlaying={state.isPlaying}
          playbackSpeed={state.playbackSpeed}
          timeRange={state.timeRange}
          onPlaybackChange={handlePlaybackUpdate}
        />
      )}

      {/* Add Feed Modal */}
      {addFeedModalOpen && (
        <AddFeedModal
          onClose={() => setAddFeedModalOpen(false)}
          onAddFeed={handleAddFeed}
        />
      )}

      {/* Plate Modal */}
      {modalPlate && (
        <PlateModal
          plate={modalPlate.plate}
          crops={modalPlate.crops}
          onClose={() => setModalPlate(null)}
        />
      )}
    </div>
  )
}

export default App