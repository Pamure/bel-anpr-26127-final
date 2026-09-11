import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import L from 'leaflet'
if (typeof window !== 'undefined') {
  (window as any).L = L
}
import 'leaflet.heat'
import { Zap } from 'lucide-react'
import { calculateBearing } from '../utils/osrm.js'
// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapViewProps {
  mode: 'trajectory' | 'live' | 'analytics' | 'alerts'
  trajectoryData: any
  activeCamera: string
  cameras: any[]
  currentTime: number
  isPlaying: boolean
  playbackSpeed: number
  timeRange: [number, number]
  onTimeChange: (time: number) => void
  onPlaybackChange: (updates: any) => void
  onDetectionClick: (detection: any) => void
  onShowPlateCrops: (plate: string, crops: any[]) => void
  detections?: any[]
}

interface MapViewRef {
  centerOnDetection: (detection: any) => void
  fitToTrajectory: () => void
  setVehiclePosition: (lat: number, lng: number, bearing: number) => void
}

const DELHI_BOUNDS = [[28.40, 76.80], [28.90, 77.40]] as L.LatLngBoundsExpression

const CAMERA_ICONS = {
  default: L.divIcon({
    className: 'camera-marker',
    html: `<div class="camera-marker-inner"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="12" r="4"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }),
  active: L.divIcon({
    className: 'camera-marker camera-active',
    html: `<div class="camera-marker-inner active"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="12" r="4"/></svg><div class="pulse-ring"></div></div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  }),
  start: L.divIcon({
    className: 'camera-marker start-marker',
    html: `<div class="marker-dot start"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }),
  end: L.divIcon({
    className: 'camera-marker end-marker',
    html: `<div class="marker-dot end"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  }),
}

const VEHICLE_ARROW = L.divIcon({
  className: 'vehicle-arrow-marker',
  html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00E599" stroke-width="2.5"><path d="M2 12l10-8 10 8-10 8z"/><path d="M6 12h12"/></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})
export const MapView = forwardRef<MapViewRef, MapViewProps>(({
  mode,
  trajectoryData,
  activeCamera,
  cameras,
  currentTime,
  isPlaying,
  playbackSpeed,
  timeRange,
  onTimeChange,
  onPlaybackChange,
  onDetectionClick,
  onShowPlateCrops,
  detections,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef({
    rawTrajectory: null as L.Polyline | null,
    osrmRoute: null as L.Polyline | null,
    directionArrows: [] as L.Marker[],
    cameraMarkers: {} as Record<string, L.Marker>,
    detectionMarkers: {} as Record<string, L.Marker>,
    vehicleMarker: null as L.Marker | null,
    startMarker: null as L.Marker | null,
    endMarker: null as L.Marker | null,
  })
  const animationRef = useRef<number>()
  const lastFrameTime = useRef<number>(0)
  const [mapReady, setMapReady] = useState(false)

  // Heatmap layer ref
  const heatLayerRef = useRef<any>(null)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    if ((mapContainer.current as any)._leaflet_id) {
      delete (mapContainer.current as any)._leaflet_id
    }

    const map = L.map(mapContainer.current, {
      center: [28.6139, 77.2090],
      zoom: 12,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: true,
    })

    // ArcGIS Dark Gray Canvas - Official Military/Tactical Base Map (Watermark-Free)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &copy; DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16,
    }).addTo(map)
    // Bind coordinates panel to live map movement
    const updateCoords = () => {
      const c = map.getCenter()
      const latEl = document.getElementById('map-lat')
      const lngEl = document.getElementById('map-lng')
      const zoomEl = document.getElementById('map-zoom')
      if (latEl) latEl.textContent = c.lat.toFixed(4)
      if (lngEl) lngEl.textContent = c.lng.toFixed(4)
      if (zoomEl) zoomEl.textContent = map.getZoom().toString()
    }
    map.on('move zoom', updateCoords)
    updateCoords()

    // Add initial camera markers
    addCameraMarkers(map)

    // Initialize Heatmap layer if plugin loaded
    if ((L as any).heatLayer) {
      try {
        const heat = (L as any).heatLayer([], {
          radius: 28,
          blur: 20,
          maxZoom: 16,
          max: 1.0,
          minOpacity: 0.35,
          gradient: {
            0.2: '#00E599',
            0.4: '#00B4D8',
            0.6: '#FFB020',
            0.8: '#FF4444',
            1.0: '#FF0000',
          },
        }).addTo(map)
        heatLayerRef.current = heat
      } catch (e) {
        console.warn('Leaflet heat layer init skipped:', e)
      }
    }

    mapRef.current = map
    setMapReady(true)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Invalidate map size when switching back to trajectory mode
  useEffect(() => {
    if (mode === 'trajectory' && mapRef.current) {
      const timer = setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [mode])

  // Keep camera markers synchronized with cameras prop
  useEffect(() => {
    if (!mapRef.current) return
    Object.values(layersRef.current.cameraMarkers).forEach(m => mapRef.current?.removeLayer(m))
    layersRef.current.cameraMarkers = {}
    addCameraMarkers(mapRef.current)
  }, [cameras, activeCamera])

  const addCameraMarkers = (map: L.Map) => {
    cameras.forEach(cam => {
      const isActive = cam.camera_id === activeCamera
      const marker = L.marker([cam.latitude, cam.longitude], {
        icon: isActive ? CAMERA_ICONS.active : CAMERA_ICONS.default,
      }).addTo(map)

      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="color: #00E599; font-weight: bold;">${cam.camera_id}</span>
            <span class="badge badge-success" style="font-size: 10px;">ACTIVE</span>
          </div>
          <div style="font-size: 11px; color: #94A3B8;">${cam.label}</div>
          <div style="font-size: 10px; color: #64748B; margin-top: 4px;">
            ${cam.latitude.toFixed(4)}, ${cam.longitude.toFixed(4)}
          </div>
        </div>
      `)

      marker.on('click', () => {
        if (mapRef.current) mapRef.current.setView([cam.latitude, cam.longitude], 15, { animate: true })
      })

      layersRef.current.cameraMarkers[cam.camera_id] = marker
    })
  }

  // Update camera markers when active camera changes
  useEffect(() => {
    if (!mapRef.current) return
    Object.entries(layersRef.current.cameraMarkers).forEach(([id, marker]) => {
      const isActive = id === activeCamera
      marker.setIcon(isActive ? CAMERA_ICONS.active : CAMERA_ICONS.default)
    })
  }, [activeCamera])

  // Render trajectory when data changes
  useEffect(() => {
    if (!mapRef.current || !trajectoryData?.points?.length) return

    const map = mapRef.current
    const points = trajectoryData.points

    // Clear existing trajectory layers
    if (layersRef.current.rawTrajectory) {
      map.removeLayer(layersRef.current.rawTrajectory)
    }
    if (layersRef.current.osrmRoute) {
      map.removeLayer(layersRef.current.osrmRoute)
    }
    layersRef.current.directionArrows.forEach(m => map.removeLayer(m))
    layersRef.current.directionArrows = []
    if (layersRef.current.startMarker) map.removeLayer(layersRef.current.startMarker)
    if (layersRef.current.endMarker) map.removeLayer(layersRef.current.endMarker)
    Object.values(layersRef.current.detectionMarkers).forEach(m => map.removeLayer(m))
    layersRef.current.detectionMarkers = {}

    // Raw trajectory (dashed gray)
    const rawCoords = points.map((p: any) => [p.latitude, p.longitude] as L.LatLngExpression)
    layersRef.current.rawTrajectory = L.polyline(rawCoords, {
      color: '#64748B',
      weight: 2,
      dashArray: '8, 8',
      opacity: 0.6,
    }).addTo(map)

    // OSRM road-matched route (check GeoJSON features or direct osrm_match geometry)
    let osrmCoords: L.LatLngExpression[] = []
    if (trajectoryData.geojson?.features) {
      const osrmFeature = trajectoryData.geojson.features.find((f: any) => f.properties?.type === 'osrm_route')
      if (osrmFeature?.geometry?.coordinates) {
        osrmCoords = osrmFeature.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as L.LatLngExpression)
      }
    }
    if (osrmCoords.length === 0 && trajectoryData.osrm_match?.geometry?.coordinates) {
      osrmCoords = trajectoryData.osrm_match.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as L.LatLngExpression)
    }

    if (osrmCoords.length > 0) {
      layersRef.current.osrmRoute = L.polyline(osrmCoords, {
        color: '#00E599',
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map)

      // Add directional arrows along route
      addDirectionArrows(map, osrmCoords)
    }

    // Detection markers
    points.forEach((p: any, idx: number) => {
      const time = new Date(p.detected_at).getTime()
      const isCurrent = Math.abs(time - currentTime) < 1000 // Within 1 second

      const marker = L.circleMarker([p.latitude, p.longitude], {
        radius: isCurrent ? 10 : 6,
        color: isCurrent ? '#00E599' : '#00B4D8',
        fillColor: isCurrent ? '#00E599' : '#00B4D8',
        fillOpacity: 0.9,
        weight: 2,
        className: `detection-marker ${isCurrent ? 'active' : ''}`,
      }).addTo(map)

      marker.bindPopup(`
        <div style="font-family: 'JetBrains Mono', monospace; min-width: 220px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span class="plate-badge" style="font-size: 14px; padding: 4px 12px;">${p.plate_normalized}</span>
          </div>
          <div style="font-size: 11px; display: grid; gap: 4px;">
            <div><span style="color:#94A3B8">CAMERA:</span> ${p.camera_label || p.camera_id}</div>
            <div><span style="color:#94A3B8">TIME:</span> ${new Date(p.detected_at).toLocaleString()}</div>
            <div><span style="color:#94A3B8">CONF:</span> ${(p.confidence * 100).toFixed(1)}%</div>
            <div><span style="color:#94A3B8">TYPE:</span> ${p.vehicle_type}</div>
          </div>
        </div>
      `)

      marker.on('click', () => onDetectionClick(p))

      layersRef.current.detectionMarkers[p.id] = marker

      // Start/End markers
      if (idx === 0) {
        layersRef.current.startMarker = L.marker([p.latitude, p.longitude], { icon: CAMERA_ICONS.start }).addTo(map)
        layersRef.current.startMarker.bindPopup('<b>START</b><br/>' + new Date(p.detected_at).toLocaleString())
      }
      if (idx === points.length - 1) {
        layersRef.current.endMarker = L.marker([p.latitude, p.longitude], { icon: CAMERA_ICONS.end }).addTo(map)
        layersRef.current.endMarker.bindPopup('<b>END</b><br/>' + new Date(p.detected_at).toLocaleString())
      }
    })

    // Fit bounds to trajectory
    if (rawCoords.length > 0) {
      map.fitBounds(L.latLngBounds(rawCoords), { padding: [50, 50], animate: true })
    }
  }, [trajectoryData, currentTime])

  const addDirectionArrows = (map: L.Map, coords: L.LatLngExpression[]) => {
    const arrowInterval = 400 // meters
    let accumulated = 0

    for (let i = 0; i < coords.length - 1; i++) {
      const p1 = L.latLng(coords[i])
      const p2 = L.latLng(coords[i + 1])
      const segmentDist = p1.distanceTo(p2)
      accumulated += segmentDist

      while (accumulated >= arrowInterval) {
        const ratio = (accumulated - arrowInterval) / segmentDist
        const lat = p1.lat + (p2.lat - p1.lat) * ratio
        const lng = p1.lng + (p2.lng - p1.lng) * ratio
        const bearing = calculateBearing(p1.lat, p1.lng, lat, lng)

        const arrow = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'direction-arrow',
            html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00B4D8" stroke-width="2"><path d="M6 12L12 6M12 6L18 12M6 12h12"/></svg>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          }),
          rotationAngle: bearing,
          rotationOrigin: 'center center',
        }).addTo(map)

        layersRef.current.directionArrows.push(arrow)
        accumulated -= arrowInterval
      }
    }
  }

  // Animation loop
  useEffect(() => {
    if (!mapRef.current || !trajectoryData?.points?.length || mode !== 'trajectory') return

    const points = trajectoryData.points
    if (points.length < 2) return

    // Build time-indexed route for interpolation
    const routeCoords = trajectoryData.osrm_match?.geometry?.coordinates
      ? trajectoryData.osrm_match.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as L.LatLngExpression)
      : points.map((p: any) => [p.latitude, p.longitude] as L.LatLngExpression)

    // Create time-to-position mapping
    const timePoints = points.map((p: any) => ({
      time: new Date(p.detected_at).getTime(),
      lat: p.latitude,
      lng: p.longitude,
    }))

    let lastTime = performance.now()

    const animate = (now: number) => {
      if (!isPlaying) {
        lastFrameTime.current = now
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      // Timescale compression: normalize trip so 1x speed plays smoothly in ~30 seconds
      const totalSpan = Math.max(1, (timeRange[1] || 1) - (timeRange[0] || 0))
      const targetDurationMs = 30000
      const compressionFactor = Math.max(1, totalSpan / targetDurationMs)

      const delta = (now - lastFrameTime.current) * playbackSpeed * compressionFactor
      lastFrameTime.current = now

      onTimeChange(t => {
        const newTime = t + delta
        if (newTime > timeRange[1]) return timeRange[0]
        return newTime
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, playbackSpeed, timeRange, onTimeChange, trajectoryData])

  // Update vehicle position on map
  useEffect(() => {
    if (!mapRef.current || !trajectoryData?.points?.length || mode !== 'trajectory') return

    const points = trajectoryData.points
    const routeCoords = trajectoryData.osrm_match?.geometry?.coordinates
      ? trajectoryData.osrm_match.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as L.LatLngExpression)
      : points.map((p: any) => [p.latitude, p.longitude] as L.LatLngExpression)

    // Find position along route for current time
    const position = interpolatePosition(routeCoords, points, currentTime)
    if (!position) return

    const { lat, lng, bearing } = position

    if (layersRef.current.vehicleMarker) {
      layersRef.current.vehicleMarker.setLatLng([lat, lng])
      // Rotate the arrow
      const iconElement = layersRef.current.vehicleMarker.getElement()
      if (iconElement) {
        iconElement.style.transform = `translate(-50%, -50%) rotate(${bearing}deg)`
      }
    } else {
      layersRef.current.vehicleMarker = L.marker([lat, lng], {
        icon: VEHICLE_ARROW,
        zIndexOffset: 1000,
      }).addTo(mapRef.current!)
    }

    // Lazy panning - only pan if vehicle leaves center 60% of view
    const bounds = mapRef.current!.getBounds()
    const center = mapRef.current!.getCenter()
    const viewWidth = bounds.getEast() - bounds.getWest()
    const viewHeight = bounds.getNorth() - bounds.getSouth()
    const marginX = viewWidth * 0.2
    const marginY = viewHeight * 0.2

    if (lng < bounds.getWest() + marginX || lng > bounds.getEast() - marginX ||
        lat < bounds.getSouth() + marginY || lat > bounds.getNorth() - marginY) {
      mapRef.current!.panTo([lat, lng], { animate: true, duration: 0.5 })
    }
  }, [currentTime, trajectoryData, mode])

  const interpolatePosition = (routeCoords: L.LatLngExpression[], points: any[], targetTime: number) => {
    if (routeCoords.length < 2 || points.length < 2) return null

    // Find the two detections that bracket the target time
    let beforeIdx = 0
    let afterIdx = points.length - 1

    for (let i = 0; i < points.length - 1; i++) {
      const t1 = new Date(points[i].detected_at).getTime()
      const t2 = new Date(points[i + 1].detected_at).getTime()
      if (targetTime >= t1 && targetTime <= t2) {
        beforeIdx = i
        afterIdx = i + 1
        break
      }
    }

    const t1 = new Date(points[beforeIdx].detected_at).getTime()
    const t2 = new Date(points[afterIdx].detected_at).getTime()
    const progress = t2 > t1 ? (targetTime - t1) / (t2 - t1) : 0

    // Map to route coordinates
    const routeIndex = progress * (routeCoords.length - 1)
    const idx = Math.floor(routeIndex)
    const frac = routeIndex - idx

    if (idx >= routeCoords.length - 1) {
      const last = routeCoords[routeCoords.length - 1]
      return { lat: last[0], lng: last[1], bearing: 0 }
    }

    const p1 = L.latLng(routeCoords[idx])
    const p2 = L.latLng(routeCoords[idx + 1])
    const lat = p1.lat + (p2.lat - p1.lat) * frac
    const lng = p1.lng + (p2.lng - p1.lng) * frac
    const bearing = calculateBearing(p1.lat, p1.lng, p2.lat, p2.lng)

    return { lat, lng, bearing }
  }

  // Ref methods
  useImperativeHandle(ref, () => ({
    centerOnDetection: (detection: any) => {
      if (mapRef.current) {
        mapRef.current.setView([detection.latitude, detection.longitude], 16, { animate: true })
      }
    },
    fitToTrajectory: () => {
      if (mapRef.current && trajectoryData?.points?.length) {
        const coords = trajectoryData.points.map((p: any) => [p.latitude, p.longitude] as L.LatLngExpression)
        mapRef.current.fitBounds(L.latLngBounds(coords), { padding: [50, 50], animate: true })
      }
    },
    setVehiclePosition: (lat: number, lng: number, bearing: number) => {
      if (layersRef.current.vehicleMarker) {
        layersRef.current.vehicleMarker.setLatLng([lat, lng])
        const el = layersRef.current.vehicleMarker.getElement()
        if (el) el.style.transform = `translate(-50%, -50%) rotate(${bearing}deg)`
      }
    },
  }))

  // Render
  return (
    <div ref={mapContainer} className="w-full h-full" style={{ zIndex: 1 }}>
      {/* Map Legend */}
      <div className="absolute top-4 left-4 z-10 panel p-3" style={{ maxWidth: '200px' }}>
        <div className="font-mono text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">LEGEND</div>
        <div className="space-y-1.5 text-xs">
          <LegendItem color="#00E599" label="OSRM Route" type="line" weight={3} />
          <LegendItem color="#64748B" label="Raw Trajectory" type="line" weight={2} dash />
          <LegendItem color="#00B4D8" label="Camera" type="circle" />
          <LegendItem color="#00E599" label="Active Camera" type="circle" ring />
          <LegendItem color="#00E599" label="Vehicle" type="arrow" />
          <LegendItem color="#00E599" label="Start" type="dot" />
          <LegendItem color="#FF334B" label="End" type="dot" />
        </div>
      </div>

      {/* Coordinates Display */}
      <div className="absolute bottom-4 left-4 z-10 panel p-2">
        <div className="font-mono text-xs">
          <div>LAT: <span id="map-lat" className="text-[var(--accent-primary)]">28.6139</span></div>
          <div>LNG: <span id="map-lng" className="text-[var(--accent-primary)]">77.2090</span></div>
          <div>ZOOM: <span id="map-zoom" className="text-[var(--accent-primary)]">11</span></div>
        </div>
      </div>

      {/* Mode Indicators */}
      {mode === 'live' && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <span className="badge badge-critical animate-blink flex items-center gap-1">
            <Zap size={10} /> LIVE
          </span>
          <span className="badge badge-info">STREAMING</span>
        </div>
      )}

      {mode === 'analytics' && (
        <div className="absolute top-4 right-4 z-10">
          <span className="badge badge-info">HEATMAP MODE</span>
        </div>
      )}
    </div>
  )
})

function LegendItem({ color, label, type, weight, dash, ring }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2">
        {type === 'line' && (
          <div className="w-8 h-1" style={{ 
            background: `repeating-linear-gradient(90deg, ${color}, ${color} ${weight * 4}px, transparent ${weight * 4}px, transparent ${dash ? weight * 8 : weight * 4}px)`,
            borderRadius: 1,
          }} />
        )}
        {type === 'circle' && (
          <div className="w-3 h-3 rounded-full border-2" style={{ 
            borderColor: color, 
            boxShadow: ring ? `0 0 8px ${color}` : 'none' 
          }} />
        )}
        {type === 'dot' && (
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        )}
        {type === 'arrow' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
            <path d="M2 12l10-8 10 8-10 8z"/><path d="M6 12h12"/>
          </svg>
        )}
      </div>
      <span className="text-[var(--text-secondary)]">{label}</span>
    </div>
  )
}

MapView.displayName = 'MapView'