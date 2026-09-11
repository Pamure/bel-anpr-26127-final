/**
 * DEMO MODE API mock — serves realistic fixture data when the real backend
 * is not running (DEMO_MODE=1). Data shapes are byte-for-byte the backend
 * response contracts so the UI code path is identical.
 *
 *   DEMO_MODE=1 npm run dev   → fixtures served
 *   npm run dev               → real backend proxied on :8088
 *
 * To run the live backend instead: scripts/run_local.sh (needs PostgreSQL
 * via docker-compose — see README).
 */
import fs from 'node:fs'
import path from 'node:path'

const DEMO = process.env.DEMO_MODE === '1'

// ---- fixtures mirroring backend SQL seed data (Delhi cameras) ----
const CAMERAS = [
  { camera_id: 'CAM_001', label: 'Connaught Place Inner Circle', latitude: 28.6315, longitude: 77.2167 },
  { camera_id: 'CAM_002', label: 'India Gate Roundabout', latitude: 28.6129, longitude: 77.2295 },
  { camera_id: 'CAM_003', label: 'ITO Intersection', latitude: 28.6282, longitude: 77.2410 },
  { camera_id: 'CAM_004', label: 'AIIMS Flyover', latitude: 28.5672, longitude: 77.2100 },
  { camera_id: 'CAM_005', label: 'Dhaula Kuan Junction', latitude: 28.5921, longitude: 77.1734 },
  { camera_id: 'CAM_006', label: 'Kashmiri Gate Metro', latitude: 28.6658, longitude: 77.2301 },
  { camera_id: 'CAM_007', label: 'Lajpat Nagar Central Market', latitude: 28.5678, longitude: 77.2432 },
  { camera_id: 'CAM_008', label: 'Karol Bagh Ajmal Khan Road', latitude: 28.6519, longitude: 77.1909 },
]

const iso = (offsetMin) => new Date(Date.now() - offsetMin * 60000).toISOString()

const DETECTIONS = [
  { id: 1, camera_id: 'CAM_001', camera_label: 'Connaught Place Inner Circle', latitude: 28.6315, longitude: 77.2167,
    plate_raw: 'DL3CAX1234', plate_normalized: 'DL3CAX1234', confidence: 0.96, vehicle_type: 'car', detected_at: iso(42) },
  { id: 2, camera_id: 'CAM_002', camera_label: 'India Gate Roundabout', latitude: 28.6129, longitude: 77.2295,
    plate_raw: 'DL3CAX1234', plate_normalized: 'DL3CAX1234', confidence: 0.93, vehicle_type: 'car', detected_at: iso(35) },
  { id: 3, camera_id: 'CAM_003', camera_label: 'ITO Intersection', latitude: 28.6282, longitude: 77.2410,
    plate_raw: 'DL3CAX1234', plate_normalized: 'DL3CAX1234', confidence: 0.9, vehicle_type: 'car', detected_at: iso(28) },
  { id: 4, camera_id: 'CAM_006', camera_label: 'Kashmiri Gate Metro', latitude: 28.6658, longitude: 77.2301,
    plate_raw: 'DL3CAX1234', plate_normalized: 'DL3CAX1234', confidence: 0.88, vehicle_type: 'car', detected_at: iso(20) },
  { id: 5, camera_id: 'CAM_008', camera_label: 'Karol Bagh Ajmal Khan Road', latitude: 28.6519, longitude: 77.1909,
    plate_raw: 'DL3CAX1234', plate_normalized: 'DL3CAX1234', confidence: 0.91, vehicle_type: 'car', detected_at: iso(12) },
]

// OSRM-like route approximation through Delhi between the camera points
const ROUTE_PTS = [
  [28.6315, 77.2167], [28.6260, 77.2190], [28.6215, 77.2225], [28.6175, 77.2258],
  [28.6145, 77.2280], [28.6129, 77.2295], [28.6170, 77.2340], [28.6220, 77.2375],
  [28.6260, 77.2395], [28.6282, 77.2410], [28.6410, 77.2385], [28.6520, 77.2345],
  [28.6600, 77.2315], [28.6658, 77.2301], [28.6645, 77.2180], [28.6595, 77.2060],
  [28.6550, 77.1975], [28.6519, 77.1909],
].map(([lat, lng]) => ({ type: 'Point', coordinates: [lng, lat], lat, lng }))

function makeTrajectory(plate) {
  const points = DETECTIONS.map(d => ({
    id: d.id, camera_id: d.camera_id, camera_label: d.camera_label,
    latitude: d.latitude, longitude: d.longitude,
    plate_raw: d.plate_raw, plate_normalized: d.plate_normalized,
    confidence: d.confidence, vehicle_type: d.vehicle_type,
    detected_at: d.detected_at,
  }))
  return {
    plate,
    mode: 'exact',
    sightings_count: points.length,
    points,
    geojson: {
      type: 'FeatureCollection',
      features: [
        ...points.map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
          properties: {
            id: p.id, plate: p.plate_normalized, camera: p.camera_label,
            camera_id: p.camera_id, detected_at: p.detected_at,
            confidence: p.confidence, vehicle_type: p.vehicle_type,
          },
        })),
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: ROUTE_PTS.map(p => p.coordinates),
          },
          properties: {
            type: 'osrm_route', distance_m: 7800, duration_s: 1210, confidence: 0.94,
          },
        },
      ],
    },
  }
}

const ALERTS = [
  {
    id: 101, alert_type: 'BLACKLIST_MATCH', plate_normalized: 'DL01AB1234',
    detection_id: 9001, created_at: iso(6),
    details: { reason: 'Stolen vehicle - FIR 142/2026 (demo fixture)' },
  },
  {
    id: 102, alert_type: 'IMPOSSIBLE_TRAVEL', plate_normalized: 'HR26DK8337',
    detection_id: 9002, created_at: iso(2),
    details: {
      speed_kmh: 452, distance_km: 15.1, time_gap_minutes: 2,
      from_camera: 'CAM_001', to_camera: 'CAM_005',
    },
  },
]

const nowH = () => new Date().getHours()

const DENSITY = CAMERAS.map((c, i) => ({
  hour_bucket: new Date(Date.now() - (nowH() % 4) * 3600000).toISOString(),
  camera_id: c.camera_id, vehicle_count: 40 + ((i * 37) % 160), unique_plates: 25 + ((i * 19) % 80),
}))

const HEATMAP = CAMERAS.map((c, i) => ({
  camera_id: c.camera_id, camera_label: c.label, latitude: c.latitude, longitude: c.longitude,
  unique_vehicles: 30 + ((i * 53) % 140), total_detections: 60 + ((i * 91) % 300),
}))

const OD = [
  { origin_camera: 'CAM_001', origin_label: CAMERAS[0].label, dest_camera: 'CAM_002', dest_label: CAMERAS[1].label, vehicle_count: 42, avg_transit_minutes: 9.2 },
  { origin_camera: 'CAM_002', origin_label: CAMERAS[1].label, dest_camera: 'CAM_003', dest_label: CAMERAS[2].label, vehicle_count: 31, avg_transit_minutes: 12.7 },
  { origin_camera: 'CAM_003', origin_label: CAMERAS[2].label, dest_camera: 'CAM_006', dest_label: CAMERAS[5].label, vehicle_count: 19, avg_transit_minutes: 18.4 },
  { origin_camera: 'CAM_005', origin_label: CAMERAS[4].label, dest_camera: 'CAM_004', dest_label: CAMERAS[3].label, vehicle_count: 14, avg_transit_minutes: 8.1 },
]

const SPEED = [
  { camera_a: 'CAM_001', camera_b: 'CAM_002', distance_km: 2.4, avg_speed_kmh: 28.3, sample_count: 42 },
  { camera_a: 'CAM_002', camera_b: 'CAM_003', distance_km: 1.9, avg_speed_kmh: 19.4, sample_count: 31 },
  { camera_a: 'CAM_001', camera_b: 'CAM_005', distance_km: 15.1, avg_speed_kmh: 52.6, sample_count: 12 },
  { camera_a: 'CAM_004', camera_b: 'CAM_007', distance_km: 3.5, avg_speed_kmh: 31.2, sample_count: 26 },
]

function json(res, obj, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(obj))
}

export default function demoMockPlugin() {
  return {
    name: 'demo-mock-api',
    configureServer(server) {
      if (!DEMO) return
      server.middlewares.use('/api', (req, res, next) => {
        const url = req.url || ''
        const m = url.match(/^\/trajectory\/([A-Z0-9]+)/i)
        if (req.method === 'GET' && m) {
          return json(res, makeTrajectory(m[1].toUpperCase()))
        }
        if (req.method === 'GET' && url.startsWith('/alerts')) {
          return json(res, ALERTS)
        }
        if (req.method === 'GET' && url.startsWith('/analytics/density')) {
          return json(res, DENSITY)
        }
        if (req.method === 'GET' && url.startsWith('/analytics/heatmap')) {
          return json(res, HEATMAP)
        }
        if (req.method === 'GET' && url.startsWith('/analytics/od')) {
          return json(res, OD)
        }
        if (req.method === 'GET' && url.startsWith('/analytics/speed')) {
          return json(res, SPEED)
        }
        if (req.method === 'GET' && url.startsWith('/analytics')) {
          return json(res, { density: DENSITY, heatmap: HEATMAP, od_matrix: OD, speed_corridors: SPEED })
        }
        if (req.method === 'GET' && url.startsWith('/stream/cameras')) {
          return json(res, { cameras: CAMERAS })
        }
        if (req.method === 'GET' && url.startsWith('/stream/stats')) {
          return json(res, { CAM_001: { frame_count: 4123, processed_count: 1374, active_tracks: 2, completed_tracks: 9 } })
        }
        if (req.method === 'GET' && url.startsWith('/blacklist')) {
          return json(res, [{ id: 1, plate_normalized: 'DL01AB1234', reason: 'Stolen vehicle (demo)', added_by: 'Delhi Police', active: true }])
        }
        if (req.method === 'POST' && url.startsWith('/detections')) {
          let body = ''
          req.on('data', c => (body += c))
          req.on('end', () => {
            try {
              const payload = JSON.parse(body)
              const cam = CAMERAS.find(c => c.camera_id === payload.camera_id) || CAMERAS[0]
              return json(res, {
                detection: {
                  id: 5000 + Math.floor(Math.random() * 9000), ...payload,
                  plate_normalized: (payload.plate_raw || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
                  camera_label: cam.label, latitude: cam.latitude, longitude: cam.longitude,
                },
                alerts_raised: [],
              }, 201)
            } catch {
              return json(res, { error: 'bad payload' }, 400)
            }
          })
          return
        }
        if (req.method === 'GET' && url.startsWith('/blacklist/check')) {
          return json(res, { blacklisted: true, plate: 'DL01AB1234', reason: 'demo' })
        }
        return next()
      })
    },
  }
}

export { DEMO }